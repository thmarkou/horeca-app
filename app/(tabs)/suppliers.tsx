import { useRouter } from "expo-router";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupplierCategoriesQuery, useSuppliersListQuery } from "@/lib/horeca-queries";

export default function SuppliersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: supplierCategories = [] } = useSupplierCategoriesQuery();
  const { data: suppliers = [] } = useSuppliersListQuery({});

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 gap-5">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Προμηθευτές</Text>
            <Text className="text-base leading-6 text-muted">
              Ανακάλυψε συνεργάτες για καφέ, πρώτες ύλες, αναλώσιμα και καθημερινές ανάγκες καταστήματος.
            </Text>
          </View>

          <View className="flex-row items-center gap-3 rounded-[22px] border border-border bg-surface px-4 py-3">
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              placeholder="Αναζήτηση προμηθευτή ή κατηγορίας"
              placeholderTextColor={String(colors.muted)}
              className="flex-1 text-base text-foreground"
              returnKeyType="done"
            />
            <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
              <IconSymbol name="line.3.horizontal.decrease.circle.fill" size={20} color={colors.primary} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {supplierCategories.map((category, index) => {
              const isActive = index === 0;
              return (
                <TouchableOpacity
                  key={category}
                  className={`rounded-full px-4 py-2 ${isActive ? "bg-primary" : "bg-surface border border-border"}`}
                >
                  <Text className={`text-sm font-semibold ${isActive ? "text-background" : "text-foreground"}`}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="gap-3 pb-2">
            {suppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  onPress={() =>
                    router.push({ pathname: "/supplier-profile", params: { id: supplier.id } })
                  }
                  className="rounded-[24px] border border-border bg-surface p-4"
                >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-semibold text-foreground">{supplier.name}</Text>
                      {supplier.verified ? (
                        <View className="rounded-full bg-success/10 px-2 py-1">
                          <Text className="text-[11px] font-semibold text-success">Verified</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-sm text-muted">
                      {supplier.category} · {supplier.location} · {supplier.rating.toFixed(1)}★
                    </Text>
                    <Text className="text-sm leading-6 text-foreground">{supplier.highlight}</Text>
                    <Text className="text-xs font-medium text-muted">
                      {supplier.deliveryTime} · {supplier.minimumOrder}
                    </Text>
                  </View>
                  <View className="rounded-full bg-primary/10 px-3 py-2">
                    <Text className="text-xs font-semibold text-primary">Νέα συνεργασία</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
