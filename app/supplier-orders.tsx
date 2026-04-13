import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { recentOrders } from "@/lib/mocks/horeca";

export default function SupplierOrdersScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Supplier orders</Text>
            <Text className="text-base leading-6 text-muted">
              Προτεραιοποίηση νέων και ενεργών παραγγελιών από την πλευρά του προμηθευτή με έμφαση στον χρόνο παράδοσης.
            </Text>
          </View>

          <View className="gap-3">
            {recentOrders.map((order) => (
              <TouchableOpacity key={order.id} onPress={() => router.push("/order-detail")} className="rounded-[24px] border border-border bg-surface p-4">
                <Text className="text-base font-semibold text-foreground">{order.id}</Text>
                <Text className="mt-1 text-sm text-muted">{order.supplierName}</Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm text-muted">{order.deliveryWindow}</Text>
                  <Text className="text-base font-bold text-foreground">{order.total}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
