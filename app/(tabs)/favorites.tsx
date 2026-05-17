import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { FavoriteSupplierHeart, SupplierCard } from "@/components/ui/supplier-card";
import { useColors } from "@/hooks/use-colors";
import { useFavoritesQuery, useFeaturedProductsQuery } from "@/lib/horeca-queries";
import { useFeatures } from "@/lib/subscription";

export default function FavoritesScreen() {
  const colors = useColors();
  const router = useRouter();
  const features = useFeatures();

  const { data: favorites = [], isPending: favoritesLoading } = useFavoritesQuery();
  const { data: featuredProducts = [] } = useFeaturedProductsQuery({ limit: 10 });

  const cappedMax = Number.isFinite(features.maxSavedSuppliers)
    ? features.maxSavedSuppliers
    : null;
  const capBadgeLabel =
    cappedMax !== null
      ? `${favorites.length} / ${cappedMax} αποθηκευμένοι`
      : `${favorites.length} αγαπημένα`;

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 gap-5">
          <View className="gap-2">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-[28px] font-bold leading-8 text-foreground">Αγαπημένα</Text>
              {!favoritesLoading && (cappedMax !== null || favorites.length > 0) ? (
                <Text className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-muted">
                  {capBadgeLabel}
                </Text>
              ) : null}
            </View>
            <Text className="text-base leading-6 text-muted">
              Κράτησε δίπλα σου τους συνεργάτες και τα προϊόντα που χρησιμοποιείς πιο συχνά για να
              παραγγέλνεις πιο γρήγορα.
            </Text>
          </View>

          <View className="gap-4">
            <Text className="text-lg font-bold text-foreground">Αποθηκευμένοι προμηθευτές</Text>

            {favoritesLoading ? (
              <View className="items-center rounded-[24px] border border-border bg-surface px-4 py-12">
                <ActivityIndicator color={colors.primary} />
                <Text className="mt-3 text-sm text-muted">Συγχρονισμός αγαπημένων…</Text>
              </View>
            ) : favorites.length === 0 ? (
              <View className="items-center gap-2 rounded-[24px] border border-dashed border-border bg-surface px-4 py-8">
                <Text className="text-center text-base text-muted">
                  Δεν έχεις ακόμα αποθηκευμένους προμηθευτές. Πήγαινε στο tab «Προμηθευτές» και πάτησε την
                  καρδιά για να τους προσθέσεις εδώ.
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Μετάβαση στους προμηθευτές"
                  onPress={() => router.push("/(tabs)/suppliers")}
                  className="mt-3 rounded-full bg-primary px-4 py-2"
                >
                  <Text className="text-sm font-semibold text-background">Προμηθευτές</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-3">
                {favorites.map((supplier) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    favoriteAccessory={<FavoriteSupplierHeart supplier={supplier} />}
                    onPress={() =>
                      router.push({ pathname: "/supplier-profile", params: { id: supplier.id } })
                    }
                  />
                ))}
              </View>
            )}
          </View>

          <View className="rounded-[28px] border border-border bg-background p-5">
            <Text className="text-lg font-bold text-foreground">Συχνές αγορές</Text>
            <View className="mt-4 gap-3">
              {featuredProducts.slice(0, 2).map((product) => (
                <TouchableOpacity
                  key={product.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Λεπτομέρειες προϊόντος: ${product.name}`}
                  className="rounded-[24px] border border-border bg-surface p-4"
                  onPress={() =>
                    router.push({
                      pathname: "/product-detail",
                      params: { id: product.id },
                    })
                  }
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">{product.name}</Text>
                      <Text className="mt-1 text-sm text-muted">
                        {product.category} · {product.unit}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-foreground">{product.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
