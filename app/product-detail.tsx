import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { useCartStore } from "@/lib/cart-store";
import { syncedAddItem } from "@/lib/cart-sync";
import { formatEur, pluralizeItems } from "@/lib/format";
import { useProductByIdQuery } from "@/lib/horeca-queries";

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id ?? "1") || 1;
  const { data: product, isLoading } = useProductByIdQuery({ id: productId });
  // Read-only: το cart-store παραμένει source of truth για το UI.
  // Mutations πάνε μέσω cart-sync (write-through στον server).
  const cartQtyForProduct = useCartStore(
    (s) => s.items.find((i) => i.productId === String(productId))?.qty ?? 0,
  );

  const [qty, setQty] = useState(1);

  const availabilityClass =
    product?.availability === "Περιορισμένο" ? "text-warning" : "text-success";
  const lineTotal = product ? product.priceEur * qty : 0;

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
      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160, gap: 20 }}
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
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
