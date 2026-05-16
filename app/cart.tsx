import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { useColors } from "@/hooks/use-colors";
import {
  selectGroupedBySupplier,
  selectTotalEur,
  selectTotalQty,
  useCartStore,
  type CartItem,
} from "@/lib/cart-store";
import {
  syncedClearBySupplier,
  syncedRemoveItem,
  syncedSetItemQty,
} from "@/lib/cart-sync";
import { formatEur, pluralizeItems } from "@/lib/format";

export default function CartScreen() {
  const router = useRouter();
  const colors = useColors();

  // Subscribe σε items μόνο — οι selector outputs υπολογίζονται μέσα στο component.
  // Έτσι αποφεύγουμε createSelector boilerplate ενώ διατηρούμε proper memoization
  // μέσω του useMemo + παραμένουμε reactive όταν αλλάζει το items array.
  // Mutations πάνε από cart-sync ώστε να γίνεται write-through στον server.
  const items = useCartStore((s) => s.items);

  const groups = useMemo(() => selectGroupedBySupplier({ items }), [items]);
  const totalQty = useMemo(() => selectTotalQty({ items }), [items]);
  const totalEur = useMemo(() => selectTotalEur({ items }), [items]);

  const isEmpty = items.length === 0;

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 gap-5 pt-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>
          {!isEmpty ? (
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
              {pluralizeItems(totalQty)}
            </Text>
          ) : null}
        </View>

        <View className="gap-1">
          <Text className="text-[28px] font-bold leading-8 text-foreground">Καλάθι</Text>
          {!isEmpty ? (
            <Text className="text-base leading-6 text-muted">
              Κάθε προμηθευτής έχει ξεχωριστή παραγγελία με δικό του χρόνο παράδοσης και ελάχιστο ποσό.
            </Text>
          ) : null}
        </View>

        {isEmpty ? (
          <View className="flex-1 justify-center">
            <EmptyState
              icon={{ name: "cart.fill", color: colors.primary }}
              title="Το καλάθι σου είναι άδειο"
              body="Ξεκίνα από τους προμηθευτές ή τον κατάλογο για να προσθέσεις προϊόντα."
              cta={{ label: "Δες προμηθευτές", onPress: () => router.push("/suppliers") }}
            />
          </View>
        ) : (
          <>
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24, gap: 16 }}
            >
              {groups.map((group) => (
                <View
                  key={group.supplierId}
                  className="gap-3 rounded-[28px] border border-border bg-surface p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Προμηθευτής
                      </Text>
                      <Text className="mt-1 text-lg font-bold text-foreground">{group.supplierName}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => void syncedClearBySupplier(group.supplierId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Αφαίρεση όλων των ειδών από ${group.supplierName}`}
                    >
                      <Text className="text-xs font-semibold text-error">Αφαίρεση όλων</Text>
                    </TouchableOpacity>
                  </View>

                  {group.items.map((item) => (
                    <CartItemRow
                      key={item.productId}
                      item={item}
                      onChangeQty={(qty) => void syncedSetItemQty(item.productId, qty)}
                      onRemove={() => void syncedRemoveItem(item.productId)}
                    />
                  ))}

                  <View className="flex-row items-center justify-between border-t border-border/60 pt-3">
                    <Text className="text-sm text-muted">Υποσύνολο</Text>
                    <Text className="text-base font-bold text-foreground">
                      {formatEur(group.subtotalEur)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View className="gap-3 pb-2">
              <View className="rounded-[24px] border border-border bg-background p-5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted">Σύνολο καλαθιού</Text>
                  <Text className="text-lg font-bold text-foreground">{formatEur(totalEur)}</Text>
                </View>
                <Text className="mt-2 text-xs leading-5 text-muted">
                  Στο checkout θα δημιουργηθεί μία ξεχωριστή παραγγελία ανά προμηθευτή.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/checkout")}
                className="rounded-full bg-primary px-4 py-4"
                accessibilityRole="button"
              >
                <Text className="text-center text-base font-semibold text-background">
                  Συνέχεια στο checkout
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

type CartItemRowProps = {
  item: CartItem;
  onChangeQty: (qty: number) => void;
  onRemove: () => void;
};

function CartItemRow({ item, onChangeQty, onRemove }: CartItemRowProps) {
  const lineTotal = item.priceEur * item.qty;
  return (
    <View className="gap-3 rounded-[24px] border border-border bg-background p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{item.productName}</Text>
          <Text className="mt-1 text-sm text-muted">
            {item.unit} · {formatEur(item.priceEur)} / μονάδα
          </Text>
        </View>
        <Text className="text-base font-bold text-foreground">{formatEur(lineTotal)}</Text>
      </View>
      <View className="flex-row items-center justify-between">
        <QtyStepper value={item.qty} onChange={onChangeQty} removeOnMin onRemove={onRemove} size="sm" />
        <TouchableOpacity onPress={onRemove} accessibilityRole="button" accessibilityLabel="Αφαίρεση από καλάθι">
          <Text className="text-xs font-semibold text-error">Αφαίρεση</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
