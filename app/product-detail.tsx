import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { GatedAction } from "@/components/ui/gated-action";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { ApiError } from "@/lib/api/http";
import { useCartStore } from "@/lib/cart-store";
import { syncedAddItem } from "@/lib/cart-sync";
import { formatEur, pluralizeItems } from "@/lib/format";
import { useCreatePriceAlertMutation, usePriceAlertsQuery, useProductByIdQuery } from "@/lib/horeca-queries";

function parseThresholdEurInput(raw: string): number | null {
  const trimmed = raw.replace(",", ".").trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id ?? "1") || 1;
  const { data: product, isLoading } = useProductByIdQuery({ id: productId });

  const { data: priceAlertsForMe = [] } = usePriceAlertsQuery();
  const createPriceAlertMutation = useCreatePriceAlertMutation();

  // Read-only: το cart-store παραμένει source of truth για το UI.
  // Mutations πάνε μέσω cart-sync (write-through στον server).
  const cartQtyForProduct = useCartStore(
    (s) => s.items.find((i) => i.productId === String(productId))?.qty ?? 0,
  );

  const [qty, setQty] = useState(1);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState("");

  const availabilityClass =
    product?.availability === "Περιορισμένο" ? "text-warning" : "text-success";
  const lineTotal = product ? product.priceEur * qty : 0;

  const pidStr = String(productId);

  const handleOpenPriceNotify = () => {
    if (!product) return;
    const existing = priceAlertsForMe.find((a) => a.productId === pidStr);
    if (existing) {
      Alert.alert("Ήδη υπάρχει ειδοποίηση", `${product.name} — άλλαξε το όριο από τη λίστα των ειδοποιήσεων.`, [
        { text: "ΟΚ", style: "cancel" },
        { text: "Άνοιγμα λίστας", onPress: () => router.push("/price-alerts") },
      ]);
      return;
    }
    setThresholdDraft(product.priceEur.toFixed(2));
    setNotifyModalOpen(true);
  };

  const handleConfirmPriceAlert = async () => {
    if (!product) return;
    const n = parseThresholdEurInput(thresholdDraft);
    if (n === null) {
      Alert.alert(
        "Μη έγκυρη τιμή",
        "Γράψε ένα θετικό ποσό σε ευρώ (π.χ. 14 ή 14,90). Θα ειδοποιηθείς όταν η τιμή καταλόγου φτάσει ή πέσει κάτω από αυτό.",
      );
      return;
    }
    try {
      await createPriceAlertMutation.mutateAsync({ productId, thresholdEur: n });
      Alert.alert(
        "Αποθηκεύτηκε",
        `Θα σου επισημάνουμε στο «Ειδοποιήσεις τιμής» όταν η τιμή του προϊόντος είναι ≤ ${formatEur(n)}.`,
        [{ text: "ΟΚ" }],
      );
      setNotifyModalOpen(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        Alert.alert("Απαιτείται Pro", "Οι price alerts διατίθενται στο Pro.", [
          { text: "Άκυρο", style: "cancel" },
          { text: "Δες τα πλάνα", onPress: () => router.push("/subscription") },
        ]);
        setNotifyModalOpen(false);
      } else if (e instanceof ApiError && e.status === 409) {
        Alert.alert("Διπλότυπο", "Ήδη υπάρχει ειδοποίηση για αυτό το SKU.", [
          { text: "ΟΚ", style: "cancel" },
          { text: "Λίστα ειδοποιήσεων", onPress: () => router.push("/price-alerts") },
        ]);
      } else {
        Alert.alert("Σφάλμα", e instanceof ApiError ? e.message : "Κάτι πήγε στραβά. Δοκίμασε ξανά.");
      }
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    void syncedAddItem(
      {
        productId: product.id,
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        productName: product.name,
        unit: product.unit,
        priceEur: product.priceEur,
      },
      qty,
    );
    Alert.alert(
      "Προστέθηκε στο καλάθι",
      `${qty} × ${product.name} (${formatEur(lineTotal)})`,
      [
        { text: "Συνέχεια αγορών", style: "cancel" },
        { text: "Δες το καλάθι", onPress: () => router.push("/cart") },
      ],
    );
  };

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <>
        <View className="flex-1">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 210, gap: 20 }}
          >
            <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
              <Text className="text-sm font-semibold text-primary">Πίσω</Text>
            </TouchableOpacity>

            {isLoading ? (
              <Text className="text-base text-muted">Φόρτωση…</Text>
            ) : product ? (
              <>
                <View className="rounded-[28px] border border-border bg-surface p-5">
                  <Text className="text-sm font-semibold text-muted">{product.supplierName}</Text>
                  <Text className="mt-2 text-[28px] font-bold leading-8 text-foreground">
                    {product.name}
                  </Text>
                  <Text className="mt-3 text-base leading-7 text-muted">{product.description}</Text>
                  <View className="mt-5 flex-row items-center justify-between">
                    <View>
                      <Text className="text-sm text-muted">Συσκευασία</Text>
                      <Text className="text-base font-semibold text-foreground">{product.unit}</Text>
                    </View>
                    <View>
                      <Text className="text-sm text-muted">Τιμή</Text>
                      <Text className="text-base font-semibold text-foreground">{product.price}</Text>
                    </View>
                    <View>
                      <Text className="text-sm text-muted">Διαθεσιμότητα</Text>
                      <Text className={`text-base font-semibold ${availabilityClass}`}>
                        {product.availability}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="gap-3 rounded-[28px] border border-border bg-background p-5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-muted">Ποσότητα</Text>
                    <QtyStepper value={qty} onChange={setQty} />
                  </View>
                  <View className="flex-row items-center justify-between border-t border-border/60 pt-3">
                    <Text className="text-sm text-muted">Σύνολο</Text>
                    <Text className="text-lg font-bold text-foreground">{formatEur(lineTotal)}</Text>
                  </View>
                  {cartQtyForProduct > 0 ? (
                    <Text className="text-xs text-muted">
                      Ήδη στο καλάθι: {pluralizeItems(cartQtyForProduct)}
                    </Text>
                  ) : null}
                </View>
              </>
            ) : (
              <Text className="text-base text-muted">Το προϊόν δεν βρέθηκε.</Text>
            )}
          </ScrollView>

          {product ? (
            <View className="absolute bottom-4 left-0 right-0 gap-3 px-1">
              <TouchableOpacity
                onPress={handleAddToCart}
                className="rounded-full bg-primary px-4 py-4"
                accessibilityRole="button"
              >
                <Text className="text-center text-base font-semibold text-background">
                  Προσθήκη στο καλάθι · {formatEur(lineTotal)}
                </Text>
              </TouchableOpacity>

              <GatedAction
                feature="canSetPriceAlerts"
                variant="outline"
                label="Ειδοποίησέ με"
                iconName="bell.fill"
                paywallTitle="Απαιτείται Pro"
                paywallMessage="Δημιούργησε ή ενημέρωσε τις ειδοποιήσεις τιμής με το πλάνο Pro."
                onUnlockedPress={handleOpenPriceNotify}
              />
            </View>
          ) : null}
        </View>

        <Modal
          transparent
          animationType="fade"
          visible={notifyModalOpen}
          onRequestClose={() => setNotifyModalOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1 justify-center px-6"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            <View className="rounded-[28px] border border-border bg-background p-5">
              <Text className="text-lg font-bold text-foreground">Όριο τιμής (€)</Text>
              <Text className="mt-2 text-sm leading-5 text-muted">
                Θέλεις να ειδοποιηθείς όταν η τρέχουσα τιμή καταλόγου είναι ίση ή χαμηλότερη από αυτό το ποσό.
              </Text>
              <TextInput
                value={thresholdDraft}
                onChangeText={setThresholdDraft}
                keyboardType="decimal-pad"
                autoFocus
                className="mt-4 rounded-2xl border border-border px-4 py-3 text-lg text-foreground placeholder:text-muted"
                placeholder="π.χ. 17,45"
              />
              <View className="mt-5 flex-row justify-end gap-3">
                <TouchableOpacity accessibilityRole="button" onPress={() => setNotifyModalOpen(false)}>
                  <Text className="py-3 text-base font-semibold text-muted">Ακύρωση</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={createPriceAlertMutation.isPending}
                  className={`rounded-full bg-primary px-5 py-3 ${createPriceAlertMutation.isPending ? "opacity-60" : ""}`}
                  onPress={() => void handleConfirmPriceAlert()}
                >
                  <Text className="text-center text-base font-semibold text-background">Αποθήκευση</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </>
    </ScreenContainer>
  );
}
