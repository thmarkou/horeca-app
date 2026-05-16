import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useCartStore, selectTotalQty, selectTotalEur } from "@/lib/cart-store";
import { formatEur, pluralizeItems } from "@/lib/format";

/**
 * Sticky bottom bar που εμφανίζεται μόνο όταν ο χρήστης έχει είδη στο cart.
 * Πρότυπο από Alibaba / Amazon Business — δίνει συνεχή ορατότητα στο cart
 * value όσο ο χρήστης φυλλομετρεί προϊόντα/προμηθευτές.
 *
 * Mount σε όλες τις buyer browsing οθόνες (home, catalog, suppliers list,
 * supplier profile, product detail). Στο /cart screen δεν χρειάζεται — εκεί
 * το checkout CTA είναι ήδη bottom-anchored.
 */
export function CartSummaryBar() {
  const router = useRouter();
  const colors = useColors();
  const totalQty = useCartStore(selectTotalQty);
  const totalEur = useCartStore(selectTotalEur);

  if (totalQty === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-4 left-4 right-4"
      accessibilityRole="summary"
    >
      <TouchableOpacity
        onPress={() => router.push("/cart")}
        accessibilityRole="button"
        accessibilityLabel={`Άνοιγμα καλαθιού, ${pluralizeItems(totalQty)}, σύνολο ${formatEur(totalEur)}`}
        className="flex-row items-center justify-between rounded-full bg-primary px-5 py-3 shadow-lg"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-background/15">
            <IconSymbol name="cart.fill" size={18} color={colors.background} />
          </View>
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wide text-background/80">
              Καλάθι
            </Text>
            <Text className="text-base font-bold text-background">
              {pluralizeItems(totalQty)} · {formatEur(totalEur)}
            </Text>
          </View>
        </View>
        <Text className="text-sm font-semibold text-background">Δες →</Text>
      </TouchableOpacity>
    </View>
  );
}
