import { useRouter } from "expo-router";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { CartSummaryBar } from "@/components/ui/cart-summary-bar";
import { syncedAddItem } from "@/lib/cart-sync";
import { useFeaturedProductsQuery, useSuppliersListQuery } from "@/lib/horeca-queries";

export default function CatalogScreen() {
  const router = useRouter();
  const { data: featuredProducts = [] } = useFeaturedProductsQuery({ limit: 50 });
  // Φέρνουμε όλους τους suppliers ώστε να γνωρίζουμε ονόματα για το cart snapshot
  // (το product δεν περιλαμβάνει το supplierName, μόνο το supplierId).
  const { data: suppliers = [] } = useSuppliersListQuery({});

  const handleAdd = (productId: string) => {
    const product = featuredProducts.find((p) => p.id === productId);
    if (!product) return;
    const supplier = suppliers.find((s) => s.id === product.supplierId);
    // void: το local update είναι sync, η server-side write-through είναι
    // fire-and-forget (errors loggαρονται μέσα στο cart-sync, δε χρειάζεται
    // ο consumer να τα χειριστεί).
    void syncedAddItem({
      productId: product.id,
      supplierId: product.supplierId,
      supplierName: supplier?.name ?? "Άγνωστος προμηθευτής",
      productName: product.name,
      unit: product.unit,
      priceEur: product.priceEur,
    });
    Alert.alert("Προστέθηκε στο καλάθι", `1 × ${product.name}`, [
      { text: "Συνέχεια αγορών", style: "cancel" },
      { text: "Δες το καλάθι", onPress: () => router.push("/cart") },
    ]);
  };

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
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
              <View key={product.id} className="gap-3 rounded-[24px] border border-border bg-surface p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground">{product.name}</Text>
                    <Text className="text-sm text-muted">
                      {product.category} · {product.unit}
                    </Text>
                  </View>
                  <Text className="text-lg font-bold text-foreground">{product.price}</Text>
                </View>
                <View className="self-start rounded-full bg-background px-3 py-1">
                  <Text className="text-xs font-semibold text-muted">{product.availability}</Text>
                </View>
                {/* 2-button row με flex-1 ώστε να μη ξεπερνάνε το πλάτος της
                    κάρτας σε καμιά συσκευή — το προηγούμενο layout (pill + 2
                    buttons σε μία σειρά) κοβόταν δεξιά σε iPhone. */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() =>
                      router.push({ pathname: "/product-detail", params: { id: product.id } })
                    }
                    className="flex-1 rounded-full border border-border bg-background px-4 py-3"
                  >
                    <Text className="text-center text-sm font-semibold text-foreground">Λεπτομέρειες</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAdd(product.id)}
                    className="flex-1 rounded-full bg-primary px-4 py-3"
                  >
                    <Text className="text-center text-sm font-semibold text-background">Στο καλάθι</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <CartSummaryBar />
    </ScreenContainer>
  );
}
