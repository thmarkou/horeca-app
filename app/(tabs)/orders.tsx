import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getOrderStatusClasses } from "@/lib/order-status-styles";
import { useRecentOrdersQuery } from "@/lib/horeca-queries";

export default function OrdersScreen() {
  const { data: recentOrders = [] } = useRecentOrdersQuery({ limit: 20 });

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 gap-5">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Παραγγελίες</Text>
            <Text className="text-base leading-6 text-muted">
              Δες τι εκκρεμεί, τι είναι καθ’ οδόν και ποια παραγγελία αξίζει να επαναλάβεις άμεσα.
            </Text>
          </View>

          <View className="flex-row gap-2">
            <View className="rounded-full bg-primary px-4 py-2">
              <Text className="text-sm font-semibold text-background">Ενεργές</Text>
            </View>
            <View className="rounded-full border border-border bg-surface px-4 py-2">
              <Text className="text-sm font-semibold text-foreground">Ιστορικό</Text>
            </View>
            <View className="rounded-full border border-border bg-surface px-4 py-2">
              <Text className="text-sm font-semibold text-foreground">Επαναλήψεις</Text>
            </View>
          </View>

          <View className="gap-3 pb-2">
            {recentOrders.map((order) => (
              <View key={order.id} className="rounded-[24px] border border-border bg-surface p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground">{order.supplierName}</Text>
                    <Text className="text-sm text-muted">{order.id} · {order.itemCount} είδη</Text>
                  </View>
                  <View className={`rounded-full px-3 py-2 ${getOrderStatusClasses(order.status)}`}>
                    <Text className="text-xs font-semibold">{order.status}</Text>
                  </View>
                </View>
                <Text className="mt-3 text-sm text-muted">Παράδοση: {order.deliveryWindow}</Text>
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-foreground">{order.total}</Text>
                  <TouchableOpacity className="rounded-full bg-primary px-4 py-2">
                    <Text className="text-sm font-semibold text-background">Reorder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
