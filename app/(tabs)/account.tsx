import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useSupplierOperationalSummaryQuery } from "@/lib/horeca-queries";

export default function AccountScreen() {
  const router = useRouter();
  const { data: supplierOperationalSummary } = useSupplierOperationalSummaryQuery();

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 gap-5">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Λογαριασμός</Text>
            <Text className="text-base leading-6 text-muted">
              Διαχειρίσου το προφίλ της επιχείρησής σου, τις προτιμήσεις σου και δες μια σύντομη operational εικόνα supplier mode.
            </Text>
          </View>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">Demo επιχείρηση</Text>
            <Text className="mt-1 text-2xl font-bold text-foreground">Urban Roast Coffee Bar</Text>
            <Text className="mt-2 text-sm leading-6 text-muted">
              Buyer mode ενεργό. Μπορείς να προχωρήσεις σε σύνδεση ή να εξερευνήσεις supplier λειτουργίες στην επόμενη φάση.
            </Text>
            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity onPress={() => router.push("/sign-in")} className="flex-1 rounded-full bg-primary px-4 py-3">
                <Text className="text-center text-sm font-semibold text-background">Σύνδεση</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/sign-up")} className="flex-1 rounded-full border border-border bg-background px-4 py-3">
                <Text className="text-center text-sm font-semibold text-foreground">Εγγραφή</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="rounded-[28px] border border-border bg-background p-5">
            <Text className="text-lg font-bold text-foreground">Supplier snapshot</Text>
            <View className="mt-4 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Νέες παραγγελίες</Text>
                <Text className="text-base font-semibold text-foreground">
                  {supplierOperationalSummary?.newOrders ?? "—"}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Σε επεξεργασία</Text>
                <Text className="text-base font-semibold text-foreground">
                  {supplierOperationalSummary?.processingOrders ?? "—"}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Χαμηλό απόθεμα</Text>
                <Text className="text-base font-semibold text-foreground">
                  {supplierOperationalSummary?.lowStockItems ?? "—"}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Τζίρος ημέρας</Text>
                <Text className="text-base font-semibold text-foreground">
                  {supplierOperationalSummary?.todayRevenue ?? "—"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
