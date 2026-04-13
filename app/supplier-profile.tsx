import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { featuredProducts } from "@/lib/mocks/horeca";

export default function SupplierProfileScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">Verified supplier</Text>
            <Text className="mt-2 text-[28px] font-bold leading-8 text-foreground">Aegean Coffee Trade</Text>
            <Text className="mt-3 text-base leading-7 text-muted">
              Προμηθευτής specialty καφέ, γάλακτος barista και συνοδευτικών για καφετέριες με κάλυψη σε Αθήνα και προάστια.
            </Text>
            <View className="mt-5 flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-muted">Βαθμολογία</Text>
                <Text className="text-base font-semibold text-foreground">4.9★</Text>
              </View>
              <View>
                <Text className="text-sm text-muted">Παράδοση</Text>
                <Text className="text-base font-semibold text-foreground">Σε 24 ώρες</Text>
              </View>
              <View>
                <Text className="text-sm text-muted">MOQ</Text>
                <Text className="text-base font-semibold text-foreground">80€</Text>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Ενδεικτικά προϊόντα</Text>
            {featuredProducts.map((product) => (
              <TouchableOpacity key={product.id} onPress={() => router.push("/product-detail")} className="rounded-[24px] border border-border bg-background p-4">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{product.name}</Text>
                    <Text className="mt-1 text-sm text-muted">{product.unit}</Text>
                  </View>
                  <Text className="text-base font-bold text-foreground">{product.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => router.push("/catalog")} className="rounded-full bg-primary px-4 py-4">
            <Text className="text-center text-base font-semibold text-background">Άνοιγμα καταλόγου</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
