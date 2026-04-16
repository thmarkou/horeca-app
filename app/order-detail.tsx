import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useRecentOrdersQuery } from "@/lib/horeca-queries";
import { getOrderStatusClasses } from "@/lib/order-status-styles";

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // Reuse the same query key as the Orders tab so navigating from the list is
  // an instant cache hit (no second network round-trip). Dedicated per-id
  // endpoint will land with the API work in a later sprint.
  const { data: orders = [], isLoading } = useRecentOrdersQuery({ limit: 20 });
  const order = id ? orders.find((o) => o.id === id) : orders[0];

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          {order ? (
            <>
              <View className="rounded-[28px] border border-border bg-surface p-5">
                <Text className="text-sm font-semibold text-muted">Παραγγελία {order.id}</Text>
                <Text className="mt-2 text-[28px] font-bold leading-8 text-foreground">
                  {order.supplierName}
                </Text>
                <Text className="mt-3 text-base leading-7 text-muted">
                  {order.itemCount} είδη · παράδοση {order.deliveryWindow.toLowerCase()}.
                </Text>
                <View
                  className={`mt-4 self-start rounded-full px-3 py-2 ${getOrderStatusClasses(order.status)}`}
                >
                  <Text className="text-xs font-semibold">{order.status}</Text>
                </View>
              </View>

              <View className="rounded-[28px] border border-border bg-background p-5">
                <Text className="text-lg font-bold text-foreground">Στοιχεία παράδοσης</Text>
                <View className="mt-4 gap-3">
                  <DetailRow label="Χρονικό παράθυρο" value={order.deliveryWindow} />
                  <DetailRow label="Αριθμός ειδών" value={String(order.itemCount)} />
                  <DetailRow label="Σύνολο" value={order.total} />
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/cart")}
                className="rounded-full bg-primary px-4 py-4"
              >
                <Text className="text-center text-base font-semibold text-background">
                  Επανάληψη παραγγελίας
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="rounded-[28px] border border-dashed border-border bg-surface/60 px-5 py-10 items-center gap-2">
              <Text className="text-base font-semibold text-foreground">
                {isLoading ? "Φόρτωση παραγγελίας…" : "Η παραγγελία δεν βρέθηκε"}
              </Text>
              {!isLoading ? (
                <Text className="text-sm text-center leading-6 text-muted">
                  Ίσως έχει διαγραφεί ή ακόμη δεν έχει συγχρονιστεί. Δοκίμασε πάλι από τη λίστα.
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)/orders")}
                className="mt-2 rounded-full bg-primary px-5 py-3"
              >
                <Text className="text-sm font-semibold text-background">Όλες οι παραγγελίες</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-base font-semibold text-foreground">{value}</Text>
    </View>
  );
}
