import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupplierCategoriesQuery, useSuppliersListQuery } from "@/lib/horeca-queries";

const ALL_CATEGORIES_KEY = "__all__";

export default function SuppliersScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: supplierCategories = [] } = useSupplierCategoriesQuery();
  // Server-side filtering όταν υπάρχει επιλεγμένη κατηγορία — ταιριάζει με το
  // contract του /api/catalog/suppliers?category=.
  const { data: suppliers = [] } = useSuppliersListQuery({
    category: selectedCategory ?? undefined,
  });

  // Client-side αναζήτηση πάνω στο ήδη φιλτραρισμένο set (όνομα, κατηγορία,
  // τοποθεσία). Αντικαθιστά το προηγούμενο «στολιστικό» input χωρίς handler.
  const visibleSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.category, s.location].some((field) => field.toLowerCase().includes(q)),
    );
  }, [suppliers, searchQuery]);

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

          <View className="flex-row items-center gap-3 rounded-[24px] border border-border bg-surface px-4 py-3">
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Αναζήτηση προμηθευτή ή κατηγορίας"
              placeholderTextColor={String(colors.muted)}
              className="flex-1 text-base text-foreground"
              returnKeyType="done"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
              <IconSymbol name="line.3.horizontal.decrease.circle.fill" size={20} color={colors.primary} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {/* «Όλες» reset chip — όταν είναι ενεργό, δεν φιλτράρεται καμία κατηγορία. */}
            <TouchableOpacity
              key={ALL_CATEGORIES_KEY}
              onPress={() => setSelectedCategory(null)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === null }}
              className={
                selectedCategory === null
                  ? "rounded-full bg-primary px-4 py-2"
                  : "rounded-full border border-border bg-surface px-4 py-2"
              }
            >
              <Text
                className={
                  selectedCategory === null
                    ? "text-sm font-semibold text-background"
                    : "text-sm font-semibold text-foreground"
                }
              >
                Όλες
              </Text>
            </TouchableOpacity>
            {supplierCategories.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  className={
                    isActive
                      ? "rounded-full bg-primary px-4 py-2"
                      : "rounded-full border border-border bg-surface px-4 py-2"
                  }
                >
                  <Text
                    className={
                      isActive
                        ? "text-sm font-semibold text-background"
                        : "text-sm font-semibold text-foreground"
                    }
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="gap-3 pb-2">
            {visibleSuppliers.length === 0 ? (
              <View className="items-center rounded-[24px] border border-dashed border-border bg-surface px-4 py-8">
                <Text className="text-center text-sm text-muted">
                  Δεν βρέθηκαν προμηθευτές με τα κριτήρια αναζήτησης.
                </Text>
              </View>
            ) : (
              visibleSuppliers.map((supplier) => (
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
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
