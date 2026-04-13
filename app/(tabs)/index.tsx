import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { featuredProducts, recentOrders, supplierCategories, suppliers } from "@/lib/mocks/horeca";

function getStatusClasses(status: string) {
  switch (status) {
    case "Ολοκληρώθηκε":
      return "bg-success/10 text-success";
    case "Καθ' οδόν":
      return "bg-primary/10 text-primary";
    case "Σε επεξεργασία":
      return "bg-warning/10 text-warning";
    default:
      return "bg-surface text-muted";
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 pb-6 gap-6">
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-medium text-muted">Καλημέρα, Δημήτρη</Text>
                <Text className="mt-1 text-[28px] font-bold leading-8 text-foreground">
                  Όλες οι προμήθειές σου σε μία ροή.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/account")}
                className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-border"
              >
                <IconSymbol name="bell.fill" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text className="text-base leading-6 text-muted">
              Βρες προμηθευτές, επανάλαβε παραγγελίες και παρακολούθησε παραδόσεις χωρίς τηλεφωνήματα και χαρτιά.
            </Text>
          </View>

          <View className="rounded-[28px] bg-primary px-5 py-5">
            <Text className="text-sm font-semibold text-background/80">Quick reorder</Text>
            <Text className="mt-2 text-2xl font-bold leading-8 text-background">
              Η επόμενη εβδομαδιαία παραγγελία σου είναι σχεδόν έτοιμη.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-background/80">
              Με βάση το πρόσφατο ιστορικό σου, μπορείς να επαναλάβεις βασικά είδη καφέ, αναλωσίμων και πρώτων υλών σε λίγα δευτερόλεπτα.
            </Text>
            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                onPress={() => router.push("/sign-in")}
                className="flex-1 rounded-full bg-background px-4 py-3"
              >
                <Text className="text-center text-sm font-semibold text-primary">Σύνδεση</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/sign-up")}
                className="flex-1 rounded-full border border-background/30 px-4 py-3"
              >
                <Text className="text-center text-sm font-semibold text-background">Δημιουργία λογαριασμού</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Κατηγορίες</Text>
              <TouchableOpacity onPress={() => router.push("/suppliers")}> 
                <Text className="text-sm font-semibold text-primary">Όλες</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {supplierCategories.map((category) => (
                <View key={category} className="rounded-full border border-border bg-surface px-4 py-2">
                  <Text className="text-sm font-medium text-foreground">{category}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Προτεινόμενοι προμηθευτές</Text>
              <TouchableOpacity onPress={() => router.push("/suppliers")}> 
                <Text className="text-sm font-semibold text-primary">Προβολή όλων</Text>
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {suppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  onPress={() => router.push("/supplier-profile")}
                  className="rounded-[24px] border border-border bg-surface p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-2">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-semibold text-foreground">{supplier.name}</Text>
                        {supplier.verified ? (
                          <View className="rounded-full bg-success/10 px-2 py-1">
                            <Text className="text-xs font-semibold text-success">Verified</Text>
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
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
                      <IconSymbol name="cart.fill.badge.plus" size={20} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Τα βασικά της εβδομάδας</Text>
              <TouchableOpacity onPress={() => router.push("/orders")}> 
                <Text className="text-sm font-semibold text-primary">Παραγγελίες</Text>
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {featuredProducts.map((product) => (
                <View key={product.id} className="rounded-[24px] border border-border bg-background px-4 py-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground">{product.name}</Text>
                      <Text className="text-sm text-muted">
                        {product.category} · {product.unit}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-foreground">{product.price}</Text>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between gap-3">
                    <View className="rounded-full bg-surface px-3 py-2">
                      <Text className="text-xs font-semibold text-muted">{product.availability}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity onPress={() => router.push("/product-detail")} className="rounded-full border border-border bg-surface px-4 py-2">
                        <Text className="text-sm font-semibold text-foreground">Λεπτομέρειες</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => router.push("/cart")} className="rounded-full bg-primary px-4 py-2">
                        <Text className="text-sm font-semibold text-background">Προσθήκη</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3 pb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Πρόσφατες παραγγελίες</Text>
              <TouchableOpacity onPress={() => router.push("/orders")}> 
                <Text className="text-sm font-semibold text-primary">Ιστορικό</Text>
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {recentOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => router.push("/order-detail")}
                  className="rounded-[24px] border border-border bg-surface p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground">{order.supplierName}</Text>
                      <Text className="text-sm text-muted">{order.id} · {order.itemCount} είδη</Text>
                    </View>
                    <View className={`rounded-full px-3 py-2 ${getStatusClasses(order.status)}`}>
                      <Text className="text-xs font-semibold">{order.status}</Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-sm text-muted">{order.deliveryWindow}</Text>
                    <Text className="text-base font-bold text-foreground">{order.total}</Text>
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
