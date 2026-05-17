import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { CartSummaryBar } from "@/components/ui/cart-summary-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SupplierCard, FavoriteSupplierHeart } from "@/components/ui/supplier-card";
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
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliersListQuery({
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

  const hasActiveFilters = selectedCategory !== null || searchQuery.trim().length > 0;
  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSearchQuery("");
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 gap-5">
          <View className="gap-2">
            <View className="flex-row items-end justify-between gap-3">
              <Text className="text-[28px] font-bold leading-8 text-foreground">Προμηθευτές</Text>
              {/* Count badge — εμφανίζεται μόνο όταν έχουμε φορτώσει & έχουμε
                  αποτελέσματα, για να μην «τρεμοπαίζει» κατά το loading. */}
              {!suppliersLoading && visibleSuppliers.length > 0 ? (
                <Text className="pb-1 text-sm font-semibold text-muted">
                  {visibleSuppliers.length}{" "}
                  {visibleSuppliers.length === 1 ? "συνεργάτης" : "συνεργάτες"}
                </Text>
              ) : null}
            </View>
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
            {suppliersLoading ? (
              <View className="items-center rounded-[24px] border border-border bg-surface px-4 py-12">
                <ActivityIndicator color={colors.primary} />
                <Text className="mt-3 text-sm text-muted">Φόρτωση προμηθευτών…</Text>
              </View>
            ) : visibleSuppliers.length === 0 ? (
              <View className="items-center gap-3 rounded-[24px] border border-dashed border-border bg-surface px-4 py-8">
                <Text className="text-center text-sm text-muted">
                  {hasActiveFilters
                    ? "Δεν βρέθηκαν προμηθευτές με αυτά τα κριτήρια."
                    : "Δεν υπάρχουν διαθέσιμοι προμηθευτές ακόμη."}
                </Text>
                {hasActiveFilters ? (
                  <TouchableOpacity
                    onPress={handleResetFilters}
                    accessibilityRole="button"
                    accessibilityLabel="Καθάρισμα φίλτρων"
                    className="rounded-full bg-primary px-4 py-2"
                  >
                    <Text className="text-sm font-semibold text-background">Καθάρισε φίλτρα</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              visibleSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  favoriteAccessory={<FavoriteSupplierHeart supplier={supplier} />}
                  onPress={() =>
                    router.push({ pathname: "/supplier-profile", params: { id: supplier.id } })
                  }
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
      <CartSummaryBar />
    </ScreenContainer>
  );
}
