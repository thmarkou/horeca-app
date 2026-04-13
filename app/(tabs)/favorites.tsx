import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { featuredProducts, suppliers } from "@/lib/mocks/horeca";

export default function FavoritesScreen() {
  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 gap-5">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Αγαπημένα</Text>
            <Text className="text-base leading-6 text-muted">
              Κράτησε δίπλα σου τους συνεργάτες και τα προϊόντα που χρησιμοποιείς πιο συχνά για να παραγγέλνεις πιο γρήγορα.
            </Text>
          </View>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-lg font-bold text-foreground">Αποθηκευμένοι προμηθευτές</Text>
            <View className="mt-4 gap-3">
              {suppliers.slice(0, 2).map((supplier) => (
                <TouchableOpacity key={supplier.id} className="rounded-[22px] border border-border bg-background p-4">
                  <Text className="text-base font-semibold text-foreground">{supplier.name}</Text>
                  <Text className="mt-1 text-sm text-muted">
                    {supplier.category} · {supplier.location}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-foreground">{supplier.highlight}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="rounded-[28px] border border-border bg-background p-5">
            <Text className="text-lg font-bold text-foreground">Συχνές αγορές</Text>
            <View className="mt-4 gap-3">
              {featuredProducts.slice(0, 2).map((product) => (
                <View key={product.id} className="rounded-[22px] border border-border bg-surface p-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">{product.name}</Text>
                      <Text className="mt-1 text-sm text-muted">
                        {product.category} · {product.unit}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-foreground">{product.price}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
