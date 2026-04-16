import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { useColors } from "@/hooks/use-colors";
import {
  useSupplierOwnProductsQuery,
  type SupplierOwnProduct,
} from "@/lib/horeca-queries";

// Αpplies το ίδιο pill vocabulary με τις υπόλοιπες οθόνες (success/warning),
// ώστε ο supplier να αναγνωρίζει άμεσα τι είναι «σε απόθεμα» και τι όχι.
function AvailabilityPill({ product }: { product: SupplierOwnProduct }) {
  const isImmediate = product.availabilityStatus === "immediate";
  return (
    <View
      className={
        isImmediate
          ? "self-start rounded-full bg-success/10 px-3 py-1"
          : "self-start rounded-full bg-warning/10 px-3 py-1"
      }
    >
      <Text
        className={
          isImmediate
            ? "text-xs font-semibold text-success"
            : "text-xs font-semibold text-warning"
        }
      >
        {product.availability}
      </Text>
    </View>
  );
}

export default function SupplierCatalogScreen() {
  const colors = useColors();
  const { data, isLoading, isError, refetch } = useSupplierOwnProductsQuery();

  const products = data?.products ?? [];
  const supplierName = data?.supplierName ?? null;
  const lowStockCount = products.filter(
    (p) => p.availabilityStatus === "limited",
  ).length;

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="pt-3 pb-6 gap-6">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Κατάλογος</Text>
            <Text className="text-base leading-6 text-muted">
              {supplierName
                ? `Τα προϊόντα της ${supplierName} όπως τα βλέπουν οι αγοραστές.`
                : "Τα προϊόντα της επιχείρησής σου όπως τα βλέπουν οι αγοραστές."}
            </Text>
          </View>

          {products.length > 0 ? (
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1 rounded-[20px] border border-border bg-surface p-4">
                <Text className="text-xs font-semibold text-muted">Σύνολο προϊόντων</Text>
                <Text className="text-[28px] font-bold leading-8 text-foreground">
                  {products.length}
                </Text>
              </View>
              <View className="flex-1 gap-1 rounded-[20px] border border-border bg-surface p-4">
                <Text className="text-xs font-semibold text-muted">Χαμηλό απόθεμα</Text>
                <Text
                  className={
                    lowStockCount > 0
                      ? "text-[28px] font-bold leading-8 text-warning"
                      : "text-[28px] font-bold leading-8 text-foreground"
                  }
                >
                  {lowStockCount}
                </Text>
              </View>
            </View>
          ) : null}

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <EmptyState
              icon={{ name: "shippingbox.fill", color: colors.warning }}
              title="Δεν καταφέραμε να φέρουμε τον κατάλογό σου"
              body="Έλεγξε τη σύνδεση και δοκίμασε ξανά."
              cta={{ label: "Δοκίμασε ξανά", onPress: () => refetch() }}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={{ name: "shippingbox.fill", color: colors.primary }}
              title="Δεν έχεις προϊόντα ακόμη"
              body="Η διαχείριση προϊόντων από το κινητό (προσθήκη, επεξεργασία, διαθεσιμότητα) ενεργοποιείται στα επόμενα βήματα."
            />
          ) : (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">Προϊόντα</Text>
              {products.map((product) => (
                <View
                  key={product.id}
                  className="gap-3 rounded-[24px] border border-border bg-surface p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground">{product.name}</Text>
                      <Text className="text-sm text-muted">
                        {product.category} · {product.unit}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-foreground">{product.price}</Text>
                  </View>
                  <AvailabilityPill product={product} />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
