import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  useSupplierOwnProductsQuery,
  useToggleSupplierProductAvailabilityMutation,
  type SupplierOwnProduct,
} from "@/lib/horeca-queries";

// Tappable pill: tap → flip availability (immediate ↔ limited) με optimistic
// update. `pending` έρχεται από το mutation του parent ώστε μόνο η ενεργή κάρτα
// να δείχνει busy state όταν υπάρχουν πολλά ταυτόχρονα PATCH requests.
function AvailabilityToggle({
  product,
  pending,
  onToggle,
}: {
  product: SupplierOwnProduct;
  pending: boolean;
  onToggle: (next: "immediate" | "limited") => void;
}) {
  const isImmediate = product.availabilityStatus === "immediate";
  const next: "immediate" | "limited" = isImmediate ? "limited" : "immediate";

  const base = isImmediate
    ? "flex-row items-center gap-2 self-start rounded-full bg-success/10 px-3 py-1"
    : "flex-row items-center gap-2 self-start rounded-full bg-warning/10 px-3 py-1";
  const textClass = isImmediate
    ? "text-xs font-semibold text-success"
    : "text-xs font-semibold text-warning";

  return (
    <TouchableOpacity
      onPress={() => onToggle(next)}
      disabled={pending}
      accessibilityRole="button"
      accessibilityLabel={`Αλλαγή διαθεσιμότητας: ${product.availability}. Πάτησε για ${next === "immediate" ? "Άμεσα διαθέσιμο" : "Περιορισμένο"}.`}
      accessibilityState={{ busy: pending }}
      className={pending ? `${base} opacity-60` : base}
    >
      {pending ? (
        <ActivityIndicator size="small" />
      ) : null}
      <Text className={textClass}>{product.availability}</Text>
    </TouchableOpacity>
  );
}

export default function SupplierCatalogScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useSupplierOwnProductsQuery();
  const toggleMutation = useToggleSupplierProductAvailabilityMutation();

  const products = data?.products ?? [];
  const supplierName = data?.supplierName ?? null;
  const lowStockCount = products.filter(
    (p) => p.availabilityStatus === "limited",
  ).length;

  // Which product is currently being toggled (for per-card busy state).
  const pendingProductId =
    toggleMutation.isPending && toggleMutation.variables
      ? toggleMutation.variables.productId
      : null;

  const openCreateForm = () => router.push("/supplier-product-form");
  const openEditForm = (id: string) =>
    router.push({ pathname: "/supplier-product-form", params: { id } });

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="pt-3 pb-6 gap-6">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-2">
              <Text className="text-[28px] font-bold leading-8 text-foreground">Κατάλογος</Text>
              <Text className="text-base leading-6 text-muted">
                {supplierName
                  ? `Τα προϊόντα της ${supplierName} όπως τα βλέπουν οι αγοραστές.`
                  : "Τα προϊόντα της επιχείρησής σου όπως τα βλέπουν οι αγοραστές."}
              </Text>
              <Text className="text-sm leading-5 text-muted">
                Πάτησε στην ετικέτα διαθεσιμότητας για να την αλλάξεις ή στο μολύβι για επεξεργασία.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={openCreateForm}
            accessibilityRole="button"
            accessibilityLabel="Προσθήκη νέου προϊόντος"
            className="flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 py-3"
          >
            <IconSymbol name="plus" size={18} color={colors.background} />
            <Text className="text-base font-semibold text-background">Νέο προϊόν</Text>
          </TouchableOpacity>

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
              body="Πρόσθεσε το πρώτο σου προϊόν για να ξεκινήσεις να δέχεσαι παραγγελίες."
              cta={{ label: "Προσθήκη προϊόντος", onPress: openCreateForm }}
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
                  {/* Availability toggle + edit action σε μία σειρά — κάθε action
                      είναι αυτόνομο touch target με καθαρό a11y label. */}
                  <View className="flex-row items-center justify-between gap-2">
                    <AvailabilityToggle
                      product={product}
                      pending={pendingProductId === product.id}
                      onToggle={(next) =>
                        toggleMutation.mutate({ productId: product.id, availability: next })
                      }
                    />
                    <TouchableOpacity
                      onPress={() => openEditForm(product.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Επεξεργασία ${product.name}`}
                      className="flex-row items-center gap-2 rounded-full border border-border bg-background px-3 py-2"
                    >
                      <IconSymbol name="pencil" size={14} color={colors.foreground} />
                      <Text className="text-xs font-semibold text-foreground">Επεξεργασία</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
