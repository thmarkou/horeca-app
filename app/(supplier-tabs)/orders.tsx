import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useRecentOrdersQuery } from "@/lib/horeca-queries";

const TITLE = "\u03a0\u03b1\u03c1\u03b1\u03b3\u03b3\u03b5\u03bb\u03af\u03b5\u03c2";
const SUB =
  "\u039d\u03ad\u03b5\u03c2 \u03ba\u03b1\u03b9 \u03b5\u03bd\u03b5\u03c1\u03b3\u03ad\u03c2 \u03c0\u03b1\u03c1\u03b1\u03b3\u03b3\u03b5\u03bb\u03af\u03b5\u03c2 \u03b1\u03c0\u03cc \u03ba\u03b1\u03c4\u03b1\u03c3\u03c4\u03ae\u03bc\u03b1\u03c4\u03b1 \u2014 \u03c0\u03c1\u03bf\u03c4\u03b5\u03c1\u03b1\u03b9\u03cc\u03c4\u03b7\u03c4\u03b1 \u03c3\u03c4\u03bf\u03bd \u03c7\u03c1\u03cc\u03bd\u03bf \u03c0\u03b1\u03c1\u03ac\u03b4\u03bf\u03c3\u03b7\u03c2.";

export default function SupplierOrdersTabScreen() {
  const router = useRouter();
  const { data: recentOrders = [] } = useRecentOrdersQuery({ limit: 20 });

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">{TITLE}</Text>
            <Text className="text-base leading-6 text-muted">{SUB}</Text>
          </View>

          <View className="gap-3">
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => router.push({ pathname: "/order-detail", params: { id: order.id } })}
                className="rounded-[24px] border border-border bg-surface p-4"
              >
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
