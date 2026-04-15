import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useFeaturedProductsQuery } from "@/lib/horeca-queries";

export default function CatalogScreen() {
  const router = useRouter();
  const { data: featuredProducts = [] } = useFeaturedProductsQuery({ limit: 50 });

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Κατάλογος προϊόντων</Text>
            <Text className="text-base leading-6 text-muted">
              Ταξινόμηση βασικών ειδών για καθημερινό ordering με προτεραιότητα σε διαθεσιμότητα και ταχύτητα παράδοσης.
            </Text>
          </View>

          <View className="gap-3">
            {featuredProducts.map((product) => (
              <View key={product.id} className="rounded-[24px] border border-border bg-surface p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground">{product.name}</Text>
                    <Text className="text-sm text-muted">
                      {product.category} · {product.unit}
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-foreground">{product.price}</Text>
                </View>
                <View className="mt-4 flex-row items-center justify-between gap-3">
                  <View className="rounded-full bg-background px-3 py-2">
                    <Text className="text-xs font-semibold text-muted">{product.availability}</Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() =>
                        router.push({ pathname: "/product-detail", params: { id: product.id } })
                      }
                      className="rounded-full border border-border bg-background px-4 py-2"
                    >
                      <Text className="text-sm font-semibold text-foreground">Λεπτομέρειες</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/cart")} className="rounded-full bg-primary px-4 py-2">
                      <Text className="text-sm font-semibold text-background">Προσθήκη στο καλάθι</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
