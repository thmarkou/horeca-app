import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function OrderDetailScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">Παραγγελία ord-1042</Text>
            <Text className="mt-2 text-[28px] font-bold leading-8 text-foreground">Aegean Coffee Trade</Text>
            <Text className="mt-3 text-base leading-7 text-muted">
              Η παραγγελία βρίσκεται σε επεξεργασία και έχει ήδη δεσμευθεί για αυριανή πρωινή παράδοση.
            </Text>
            <View className="mt-4 rounded-full self-start bg-warning/10 px-3 py-2">
              <Text className="text-xs font-semibold text-warning">Σε επεξεργασία</Text>
            </View>
          </View>

          <View className="rounded-[28px] border border-border bg-background p-5">
            <Text className="text-lg font-bold text-foreground">Στοιχεία παράδοσης</Text>
            <View className="mt-4 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Χρονικό παράθυρο</Text>
                <Text className="text-base font-semibold text-foreground">Αύριο 08:00–11:00</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Σημείωση</Text>
                <Text className="text-base font-semibold text-foreground">Παραλαβή από πίσω είσοδο</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Σύνολο</Text>
                <Text className="text-base font-semibold text-foreground">146,20€</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push("/cart")} className="rounded-full bg-primary px-4 py-4">
            <Text className="text-center text-base font-semibold text-background">Επανάληψη παραγγελίας</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
