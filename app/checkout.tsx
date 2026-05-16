import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { useColors } from "@/hooks/use-colors";
import {
  selectGroupedBySupplier,
  selectTotalEur,
  useCartStore,
  type CartSupplierGroup,
} from "@/lib/cart-store";
import { parseMinimumOrderEur } from "@/lib/cart-pricing";
import { syncedClearBySupplier } from "@/lib/cart-sync";
import { formatEur, pluralizeItems } from "@/lib/format";
import {
  useCreateOrderMutation,
  useSuppliersListQuery,
  type CreatedOrder,
} from "@/lib/horeca-queries";
import type { Supplier } from "@/lib/mocks/horeca";

type SubmitOutcome =
  | { kind: "supplier"; supplierId: string; supplierName: string; status: "ok"; order: CreatedOrder }
  | { kind: "supplier"; supplierId: string; supplierName: string; status: "error"; message: string };

export default function CheckoutScreen() {
  const router = useRouter();
  const colors = useColors();

  // Subscribe σε items μόνο — αλλιώς κάθε re-render του store θα ξανα-φτιάχνει
  // ολόκληρο groups array και τα notes inputs θα χάνουν εστίαση. Mutations
  // πάνε από cart-sync ώστε ο server cart να μένει συγχρονισμένος.
  const items = useCartStore((s) => s.items);

  const groups = useMemo(() => selectGroupedBySupplier({ items }), [items]);
  const grandTotal = useMemo(() => selectTotalEur({ items }), [items]);
  const totalQty = useMemo(() => items.reduce((acc, i) => acc + i.qty, 0), [items]);

  // Suppliers για το MOQ check — ο cart store δεν κρατάει `minimumOrder` στα
  // items του (αυτό αλλάζει όταν ο supplier επεξεργαστεί το profile, ενώ τα
  // cart items είναι αυτοτελή snapshots). Παίρνουμε fresh values από το API.
  const { data: suppliersList = [] } = useSuppliersListQuery({});
  const suppliersById = useMemo(() => {
    const map = new Map<string, Supplier>();
    for (const s of suppliersList) map.set(s.id, s);
    return map;
  }, [suppliersList]);

  // Ξεχωριστά notes ανά supplier — γιατί διαφορετικός προμηθευτής, διαφορετική
  // οδηγία (π.χ. «αφήστε στο εργαστήριο» vs «καλέστε πριν»).
  const [notesBySupplier, setNotesBySupplier] = useState<Record<string, string>>({});

  const createOrder = useCreateOrderMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmpty = items.length === 0;

  async function handleSubmit() {
    if (isSubmitting || isEmpty) return;
    setIsSubmitting(true);

    const outcomes: SubmitOutcome[] = [];
    // Sequential loop — κρατάμε προβλέψιμη σειρά και έχουμε per-supplier
    // rollback granularity. Αν ένας supplier σκάσει, οι υπόλοιποι συνεχίζουν
    // και ο failed παραμένει στο cart για retry.
    for (const group of groups) {
      try {
        const order = await createOrder.mutateAsync({
          supplierId: Number(group.supplierId),
          items: group.items.map((i) => ({
            productId: Number(i.productId),
            qty: i.qty,
          })),
          notes: notesBySupplier[group.supplierId]?.trim() || undefined,
        });
        // syncedClearBySupplier κάνει local clear + DELETE στο server.
        // Δεν αναμένουμε το server delete — αν αποτύχει, την επόμενη φορά
        // που ο user ανοίξει το cart το bootstrap θα reconcile.
        void syncedClearBySupplier(group.supplierId);
        outcomes.push({
          kind: "supplier",
          supplierId: group.supplierId,
          supplierName: group.supplierName,
          status: "ok",
          order,
        });
      } catch (e) {
        outcomes.push({
          kind: "supplier",
          supplierId: group.supplierId,
          supplierName: group.supplierName,
          status: "error",
          message: e instanceof Error ? e.message : "Σφάλμα δημιουργίας παραγγελίας.",
        });
      }
    }

    setIsSubmitting(false);
    presentOutcomeAlert(outcomes);
  }

  function presentOutcomeAlert(outcomes: SubmitOutcome[]) {
    const successes = outcomes.filter((o) => o.status === "ok");
    const failures = outcomes.filter((o) => o.status === "error");

    if (failures.length === 0) {
      // Όλα πέρασαν — navigate στο orders tab για να δει αμέσως τη νέα ροή.
      Alert.alert(
        successes.length === 1
          ? "Η παραγγελία δημιουργήθηκε"
          : `${successes.length} παραγγελίες δημιουργήθηκαν`,
        "Μπορείς να τις δεις στο tab «Παραγγελίες».",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/orders") }],
      );
      return;
    }

    if (successes.length === 0) {
      // Πλήρης αποτυχία — το cart παραμένει intact, δίνουμε retry option.
      Alert.alert(
        "Αποτυχία αποστολής",
        failures.map((f) => `• ${f.supplierName}: ${f.message}`).join("\n"),
        [
          { text: "OK", style: "cancel" },
          { text: "Δοκίμασε ξανά", onPress: handleSubmit },
        ],
      );
      return;
    }

    // Partial: εξήγησε καθαρά τι πέρασε και τι έμεινε στο cart.
    Alert.alert(
      "Μερική επιτυχία",
      `Δημιουργήθηκαν ${successes.length}/${outcomes.length} παραγγελίες.\n\nΑπέτυχαν:\n${failures
        .map((f) => `• ${f.supplierName}: ${f.message}`)
        .join("\n")}`,
      [
        { text: "Επιστροφή στο καλάθι", onPress: () => router.replace("/cart") },
        { text: "Δες παραγγελίες", onPress: () => router.replace("/(tabs)/orders") },
      ],
    );
  }

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 gap-5 pt-2">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
              <Text className="text-sm font-semibold text-primary">Πίσω</Text>
            </TouchableOpacity>
            {!isEmpty ? (
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                {groups.length === 1
                  ? "1 παραγγελία"
                  : `${groups.length} παραγγελίες`}
              </Text>
            ) : null}
          </View>

          <View className="gap-1">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Επιβεβαίωση</Text>
            {!isEmpty ? (
              <Text className="text-base leading-6 text-muted">
                Θα δημιουργηθεί μία ξεχωριστή παραγγελία ανά προμηθευτή. Οι τιμές κλειδώνονται από τον κατάλογο του προμηθευτή.
              </Text>
            ) : null}
          </View>

          {/* Summary strip — μία ματιά: πόσοι προμηθευτές, πόσα είδη, πόσο
              κοστίζει συνολικά. Πιο γρήγορη ανατροφοδότηση από το να
              σκρολάρει ο user μέχρι κάτω. */}
          {!isEmpty ? (
            <View className="flex-row gap-2 rounded-[24px] bg-surface p-3">
              <SummaryTile
                label={groups.length === 1 ? "Προμηθευτής" : "Προμηθευτές"}
                value={String(groups.length)}
              />
              <SummaryTile label="Είδη" value={String(totalQty)} />
              <SummaryTile label="Σύνολο" value={formatEur(grandTotal)} />
            </View>
          ) : null}

          {isEmpty ? (
            <View className="flex-1 justify-center">
              <EmptyState
                icon={{ name: "cart.fill", color: colors.primary }}
                title="Δεν υπάρχει τίποτα προς αποστολή"
                body="Πρόσθεσε προϊόντα στο καλάθι για να συνεχίσεις στο checkout."
                cta={{ label: "Δες προμηθευτές", onPress: () => router.replace("/suppliers") }}
              />
            </View>
          ) : (
            <>
              <ScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24, gap: 16 }}
              >
                {groups.map((group) => (
                  <SupplierOrderCard
                    key={group.supplierId}
                    group={group}
                    supplier={suppliersById.get(group.supplierId) ?? null}
                    notes={notesBySupplier[group.supplierId] ?? ""}
                    onChangeNotes={(text) =>
                      setNotesBySupplier((prev) => ({ ...prev, [group.supplierId]: text }))
                    }
                  />
                ))}
              </ScrollView>

              <View className="gap-3 pb-2">
                <View className="rounded-[24px] border border-border bg-background p-5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted">Σύνολο</Text>
                    <Text className="text-lg font-bold text-foreground">
                      {formatEur(grandTotal)}
                    </Text>
                  </View>
                  <Text className="mt-2 text-xs leading-5 text-muted">
                    Η χρέωση και ο χρόνος παράδοσης επιβεβαιώνονται από κάθε προμηθευτή χωριστά.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSubmitting }}
                  className={`flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 py-4 ${
                    isSubmitting ? "opacity-60" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.background} />
                  ) : null}
                  <Text className="text-center text-base font-semibold text-background">
                    {isSubmitting
                      ? "Αποστολή…"
                      : groups.length === 1
                        ? "Αποστολή παραγγελίας"
                        : `Αποστολή ${groups.length} παραγγελιών`}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

type SupplierOrderCardProps = {
  group: CartSupplierGroup;
  /**
   * Ο πλήρης supplier record (αν διαθέσιμος) — χρησιμοποιείται μόνο για
   * το MOQ guard. Αν είναι `null` (π.χ. dirty cart με stale supplierId),
   * το MOQ check παρακάμπτεται σιωπηλά.
   */
  supplier: Supplier | null;
  notes: string;
  onChangeNotes: (text: string) => void;
};

function SupplierOrderCard({ group, supplier, notes, onChangeNotes }: SupplierOrderCardProps) {
  const colors = useColors();
  const totalQty = group.items.reduce((acc, i) => acc + i.qty, 0);

  // MOQ guard: warning non-blocking — επιτρέπει το submission αλλά
  // ενημερώνει τον user ότι μπορεί ο supplier να αρνηθεί.
  const moqEur = supplier ? parseMinimumOrderEur(supplier.minimumOrder) : null;
  const isBelowMoq = moqEur !== null && group.subtotalEur < moqEur;

  return (
    <View className="gap-3 rounded-[28px] border border-border bg-surface p-4">
      <View>
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
          Προμηθευτής
        </Text>
        <Text className="mt-1 text-lg font-bold text-foreground">{group.supplierName}</Text>
        <Text className="mt-1 text-xs text-muted">{pluralizeItems(totalQty)}</Text>
      </View>

      {isBelowMoq && moqEur !== null ? (
        <View className="flex-row items-start gap-2 rounded-2xl bg-warning/10 px-3 py-2">
          <Text className="text-sm font-semibold text-warning">⚠</Text>
          <Text className="flex-1 text-xs leading-5 text-warning">
            Κάτω από το ελάχιστο των {formatEur(moqEur)}. Λείπουν{" "}
            {formatEur(moqEur - group.subtotalEur)}. Ο προμηθευτής μπορεί να ζητήσει
            προσθήκη ειδών ή να απορρίψει την παραγγελία.
          </Text>
        </View>
      ) : null}

      <View className="gap-2">
        {group.items.map((item) => (
          <View
            key={item.productId}
            className="flex-row items-start justify-between gap-3 rounded-2xl bg-background px-3 py-3"
          >
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
                {item.productName}
              </Text>
              <Text className="mt-1 text-xs text-muted">
                {item.qty} × {formatEur(item.priceEur)} · {item.unit}
              </Text>
            </View>
            <Text className="text-sm font-bold text-foreground">
              {formatEur(item.priceEur * item.qty)}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
          Σημείωση προς προμηθευτή
        </Text>
        <TextInput
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="Προαιρετική οδηγία (παραλαβή, ώρα κ.λπ.)"
          placeholderTextColor={String(colors.muted)}
          multiline
          numberOfLines={2}
          maxLength={500}
          className="rounded-2xl border border-border bg-background px-3 py-3 text-sm text-foreground"
        />
      </View>

      <View className="flex-row items-center justify-between border-t border-border/60 pt-3">
        <Text className="text-sm text-muted">Υποσύνολο</Text>
        <Text className="text-base font-bold text-foreground">{formatEur(group.subtotalEur)}</Text>
      </View>
    </View>
  );
}

/**
 * Reusable info tile για τη summary strip στην κορυφή. Κρατάμε το design
 * αυτοτελές εδώ (αντί να ξανα-χρησιμοποιήσουμε `MetricTile`) επειδή τα
 * checkout tiles είναι μικρότερα — μέγεθος καρτών για compact strip, όχι
 * για dashboard hero.
 */
function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-background p-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </Text>
      <Text className="mt-1 text-base font-bold text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
