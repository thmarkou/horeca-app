import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useSupplierOperationalSummaryQuery } from "@/lib/horeca-queries";

export default function SupplierDashboardScreen() {
  const router = useRouter();
  const { data: supplierOperationalSummary } = useSupplierOperationalSummaryQuery();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Supplier dashboard</Text>
            <Text className="text-base leading-6 text-muted">
              Γρήγορη εικόνα για νέες παραγγελίες, επεξεργασία, χαμηλό απόθεμα και απόδοση ημέρας.
            </Text>
          </View>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted">Νέες παραγγελίες</Text>
              <Text className="text-lg font-bold text-foreground">
                {supplierOperationalSummary?.newOrders ?? "—"}
              </Text>
            </View>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-muted">Σε επεξεργασία</Text>
              <Text className="text-lg font-bold text-foreground">
                {supplierOperationalSummary?.processingOrders ?? "—"}
              </Text>
            </View>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-muted">Χαμηλό απόθεμα</Text>
              <Text className="text-lg font-bold text-foreground">
                {supplierOperationalSummary?.lowStockItems ?? "—"}
              </Text>
            </View>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-muted">Τζίρος ημέρας</Text>
              <Text className="text-lg font-bold text-foreground">
                {supplierOperationalSummary?.todayRevenue ?? "—"}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push("/supplier-orders")} className="rounded-full bg-primary px-4 py-4">
            <Text className="text-center text-base font-semibold text-background">Προβολή supplier orders</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
