import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { useColors } from "@/hooks/use-colors";
import { selectGroupedBySupplier, useCartStore } from "@/lib/cart-store";
import { syncedAddItem } from "@/lib/cart-sync";
import { formatEur, pluralizeItems } from "@/lib/format";
import {
  useOrderQuery,
  useUpdateOrderStatusMutation,
  type OrderDetail,
  type OrderLineItem,
  type OrderStatusTransition,
} from "@/lib/horeca-queries";

export default function OrderDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // Το `id` που έρχεται από το navigation είναι ο publicId (πχ "ord-abc12345").
  // Single source of truth = το dedicated endpoint· δεν φιλτράρουμε πια τη
  // λίστα recentOrders (που δεν είχε γραμμές, notes, ή totalEur).
  const { data: order = null, isLoading, error } = useOrderQuery({ publicId: id });

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color={String(colors.primary)} />
            </View>
          ) : order ? (
            <OrderDetailBody order={order} />
          ) : (
            <EmptyState
              icon={{ name: "shippingbox.fill", color: String(colors.primary) }}
              title={error ? "Σφάλμα φόρτωσης" : "Η παραγγελία δεν βρέθηκε"}
              body={
                error
                  ? "Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά."
                  : "Ίσως έχει διαγραφεί ή δεν έχεις πρόσβαση σε αυτήν."
              }
              cta={{
                label: "Όλες οι παραγγελίες",
                onPress: () => router.replace("/(tabs)/orders"),
              }}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function OrderDetailBody({ order }: { order: OrderDetail }) {
  const router = useRouter();
  // Read-only cart state — mutations πάνε από cart-sync (write-through).
  const cartItems = useCartStore((s) => s.items);

  // Role-driven CTAs: ο server μας λέει αν βλέπουμε σαν supplier ή buyer
  // (Φάση 0.5). Έτσι δείχνουμε supplier action buttons σε αυτόν που μπορεί
  // πραγματικά να τα πατήσει, χωρίς να χρειάζεται δεύτερο network call.
  const isSupplierView = order.viewerRole === "supplier";

  const handleRepeat = () => {
    if (!order.items.length) return;
    for (const item of order.items) {
      void syncedAddItem(
        {
          productId: item.productId,
          supplierId: order.supplierId,
          supplierName: order.supplierName,
          productName: item.productName,
          unit: item.unit,
          priceEur: item.unitPriceEur,
        },
        item.qty,
      );
    }
    // Αν ο user είχε ήδη items άλλου supplier, δείξε σύντομο context message
    // πριν τον στείλεις στο cart. Αλλιώς, απλό success.
    const otherSuppliers = selectGroupedBySupplier({ items: cartItems }).filter(
      (g) => g.supplierId !== order.supplierId,
    );
    Alert.alert(
      "Προστέθηκαν στο καλάθι",
      otherSuppliers.length > 0
        ? `${order.items.length} είδη από ${order.supplierName}. Στο καλάθι υπάρχουν ήδη προϊόντα από ${otherSuppliers.length} ακόμη προμηθευτή/ες.`
        : `${order.items.length} είδη από ${order.supplierName}.`,
      [
        { text: "Δες το καλάθι", onPress: () => router.push("/cart") },
        { text: "Συνέχισε αγορές", style: "cancel" },
      ],
    );
  };

  return (
    <>
      <View className="rounded-[28px] border border-border bg-surface p-5">
        <Text className="text-sm font-semibold text-muted">Παραγγελία {order.publicId}</Text>
        <Text className="mt-2 text-[28px] font-bold leading-8 text-foreground">
          {order.counterpartyName}
        </Text>
        <Text className="mt-3 text-base leading-7 text-muted">
          {pluralizeItems(order.itemCount)} · παράδοση {order.deliveryWindow.toLowerCase()}.
        </Text>
        <StatusPill status={order.status} className="mt-4 self-start" />
      </View>

      <OrderItemsCard items={order.items} totalLabel={order.total} />

      {order.notes?.trim() ? (
        <View className="rounded-[28px] border border-border bg-surface p-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
            Σημείωση
          </Text>
          <Text className="mt-2 text-base leading-6 text-foreground">{order.notes}</Text>
        </View>
      ) : null}

      <View className="rounded-[28px] border border-border bg-background p-5">
        <Text className="text-lg font-bold text-foreground">Στοιχεία παράδοσης</Text>
        <View className="mt-4 gap-3">
          <DetailRow label="Χρονικό παράθυρο" value={order.deliveryWindow} />
          <DetailRow label="Αριθμός ειδών" value={String(order.itemCount)} />
          <DetailRow label="Σύνολο" value={order.total} />
        </View>
      </View>

      {isSupplierView ? (
        <SupplierActions order={order} />
      ) : (
        <TouchableOpacity
          onPress={handleRepeat}
          disabled={order.items.length === 0}
          accessibilityRole="button"
          className={`rounded-full bg-primary px-4 py-4 ${order.items.length === 0 ? "opacity-50" : ""}`}
        >
          <Text className="text-center text-base font-semibold text-background">
            Επανάληψη παραγγελίας
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

function OrderItemsCard({ items, totalLabel }: { items: OrderLineItem[]; totalLabel: string }) {
  const totalQty = useMemo(() => items.reduce((acc, it) => acc + it.qty, 0), [items]);
  if (items.length === 0) {
    return (
      <View className="rounded-[28px] border border-dashed border-border bg-surface/60 px-5 py-8 items-center">
        <Text className="text-sm text-muted">Δεν υπάρχουν γραμμές για αυτή την παραγγελία.</Text>
      </View>
    );
  }
  return (
    <View className="rounded-[28px] border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-foreground">Είδη</Text>
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
          {pluralizeItems(totalQty)}
        </Text>
      </View>
      <View className="mt-4 gap-3">
        {items.map((item) => (
          <View
            key={item.id}
            className="flex-row items-start justify-between gap-3 rounded-2xl bg-background px-3 py-3"
          >
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
                {item.productName}
              </Text>
              <Text className="mt-1 text-xs text-muted">
                {item.qty} × {formatEur(item.unitPriceEur)} · {item.unit}
              </Text>
            </View>
            <Text className="text-sm font-bold text-foreground">{item.lineTotal}</Text>
          </View>
        ))}
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t border-border/60 pt-3">
        <Text className="text-sm text-muted">Σύνολο</Text>
        <Text className="text-base font-bold text-foreground">{totalLabel}</Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-base font-semibold text-foreground">{value}</Text>
    </View>
  );
}

/**
 * Map current order status → ποιες ενέργειες έχει διαθέσιμες ο supplier.
 * Single source of truth στον client· ο server κάνει επιπλέον έλεγχο, οπότε
 * αν εδώ ξεμείνει κάτι out-of-sync το PATCH θα γυρίσει 409 αντί για bypass.
 */
function getSupplierActions(status: string): {
  primary?: { label: string; status: OrderStatusTransition; confirmTitle: string; confirmBody: string };
  secondary?: { label: string; status: OrderStatusTransition; confirmTitle: string; confirmBody: string; destructive?: boolean };
} {
  switch (status) {
    case "Νέα":
      return {
        primary: {
          label: "Αποδοχή",
          status: "processing",
          confirmTitle: "Αποδοχή παραγγελίας",
          confirmBody: "Επιβεβαιώνεις ότι αναλαμβάνεις αυτή την παραγγελία;",
        },
        secondary: {
          label: "Απόρριψη",
          status: "cancelled",
          confirmTitle: "Απόρριψη παραγγελίας",
          confirmBody: "Η ενέργεια ακυρώνει οριστικά την παραγγελία.",
          destructive: true,
        },
      };
    case "Σε επεξεργασία":
    case "Καθ' οδόν":
      return {
        primary: {
          label: "Σήμανση ως παραδόθηκε",
          status: "completed",
          confirmTitle: "Επιβεβαίωση παράδοσης",
          confirmBody: "Η παραγγελία θα μαρκαριστεί ως ολοκληρωμένη.",
        },
      };
    default:
      // Terminal states (Ολοκληρώθηκε, Ακυρώθηκε) — καμία ενέργεια.
      return {};
  }
}

type SupplierAction = NonNullable<ReturnType<typeof getSupplierActions>["primary"]> & {
  destructive?: boolean;
};

function SupplierActions({ order }: { order: OrderDetail }) {
  const updateStatus = useUpdateOrderStatusMutation();
  const { primary, secondary } = getSupplierActions(order.status);

  if (!primary && !secondary) {
    // Τερματικό state (Ολοκληρώθηκε / Ακυρώθηκε) — η status pill στην κορυφή
    // τα λέει όλα. Αποφεύγουμε visual noise από άδειο card.
    return null;
  }

  const isBusy = updateStatus.isPending;

  const askThenSubmit = (action: SupplierAction) => {
    Alert.alert(action.confirmTitle, action.confirmBody, [
      { text: "Άκυρο", style: "cancel" },
      {
        text: "Επιβεβαίωση",
        style: action.destructive ? "destructive" : "default",
        onPress: () => {
          updateStatus.mutate(
            { publicId: order.publicId, status: action.status },
            {
              onError: (e) => {
                const msg = e instanceof Error ? e.message : "Αποτυχία ενημέρωσης κατάστασης.";
                Alert.alert("Σφάλμα", msg);
              },
            },
          );
        },
      },
    ]);
  };

  return (
    <View className="gap-3">
      {primary ? (
        <TouchableOpacity
          onPress={() => askThenSubmit(primary)}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          className={`flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 py-4 ${isBusy ? "opacity-60" : ""}`}
        >
          {isBusy ? <ActivityIndicator color="white" /> : null}
          <Text className="text-center text-base font-semibold text-background">{primary.label}</Text>
        </TouchableOpacity>
      ) : null}

      {secondary ? (
        <TouchableOpacity
          onPress={() => askThenSubmit(secondary)}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          className={`flex-row items-center justify-center rounded-full border px-4 py-4 ${
            secondary.destructive ? "border-error" : "border-border"
          } ${isBusy ? "opacity-50" : ""}`}
        >
          <Text
            className={`text-center text-base font-semibold ${
              secondary.destructive ? "text-error" : "text-foreground"
            }`}
          >
            {secondary.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
