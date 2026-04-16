import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useSupplierOperationalSummaryQuery } from "@/lib/horeca-queries";

const TITLE = "\u03a0\u03af\u03bd\u03b1\u03ba\u03b1\u03c2 \u03b5\u03bb\u03ad\u03b3\u03c7\u03bf\u03c5";
const SUB =
  "\u0395\u03b9\u03ba\u03cc\u03bd\u03b1 \u03b7\u03bc\u03ad\u03c1\u03b1\u03c2 \u03b3\u03b9\u03b1 \u03bd\u03ad\u03b5\u03c2 \u03c0\u03b1\u03c1\u03b1\u03b3\u03b3\u03b5\u03bb\u03af\u03b5\u03c2, \u03b5\u03c0\u03b5\u03be\u03b5\u03c1\u03b3\u03b1\u03c3\u03af\u03b1, \u03c7\u03b1\u03bc\u03b7\u03bb\u03cc \u03b1\u03c0\u03cc\u03b8\u03b5\u03bc\u03b1 \u03ba\u03b1\u03b9 \u03c4\u03b6\u03af\u03c1\u03bf.";
const NEW_ORDERS = "\u039d\u03ad\u03b5\u03c2 \u03c0\u03b1\u03c1\u03b1\u03b3\u03b3\u03b5\u03bb\u03af\u03b5\u03c2";
const PROCESSING = "\u03a3\u03b5 \u03b5\u03c0\u03b5\u03be\u03b5\u03c1\u03b3\u03b1\u03c3\u03af\u03b1";
const LOW_STOCK = "\u03a7\u03b1\u03bc\u03b7\u03bb\u03cc \u03b1\u03c0\u03cc\u03b8\u03b5\u03bc\u03b1";
const REVENUE = "\u03a4\u03b6\u03af\u03c1\u03bf\u03c2 \u03b7\u03bc\u03ad\u03c1\u03b1\u03c2";
const CTA_ALL = "\u038c\u03bb\u03b5\u03c2 \u03bf\u03b9 \u03c0\u03b1\u03c1\u03b1\u03b3\u03b3\u03b5\u03bb\u03af\u03b5\u03c2";

export default function SupplierDashboardTabScreen() {
  const router = useRouter();
  const { data: supplierOperationalSummary } = useSupplierOperationalSummaryQuery();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">{TITLE}</Text>
            <Text className="text-base leading-6 text-muted">{SUB}</Text>
          </View>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted">{NEW_ORDERS}</Text>
              <Text className="text-lg font-bold text-foreground">
                {supplierOperationalSummary?.newOrders ?? "—"}
              </Text>
            </View>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-muted">{PROCESSING}</Text>
              <Text className="text-lg font-bold text-foreground">
                {supplierOperationalSummary?.processingOrders ?? "—"}
              </Text>
            </View>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-muted">{LOW_STOCK}</Text>
              <Text className="text-lg font-bold text-foreground">
                {supplierOperationalSummary?.lowStockItems ?? "—"}
              </Text>
            </View>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-muted">{REVENUE}</Text>
              <Text className="text-lg font-bold text-foreground">
                {supplierOperationalSummary?.todayRevenue ?? "—"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(supplier-tabs)/orders")}
            className="rounded-full border border-border bg-surface px-4 py-4"
          >
            <Text className="text-center text-base font-semibold text-foreground">{CTA_ALL}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
