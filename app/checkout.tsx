import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function CheckoutScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Checkout</Text>
            <Text className="text-base leading-6 text-muted">
              Επιβεβαίωση χρόνου παράδοσης, σημειώσεων παραγγελίας και συνολικού ποσού πριν την αποστολή στον προμηθευτή.
            </Text>
          </View>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">Παράδοση</Text>
            <Text className="mt-2 text-lg font-semibold text-foreground">Αύριο 08:00–11:00</Text>
            <Text className="mt-2 text-sm leading-6 text-muted">
              Διεύθυνση: Κολοκοτρώνη 24, Αθήνα · Σημείωση: Παραλαβή από πίσω είσοδο κουζίνας.
            </Text>
          </View>

          <View className="rounded-[28px] border border-border bg-background p-5">
            <Text className="text-sm font-semibold text-muted">Σύνοψη κόστους</Text>
            <View className="mt-4 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Υποσύνολο</Text>
                <Text className="text-base font-semibold text-foreground">111,60€</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Μεταφορικά</Text>
                <Text className="text-base font-semibold text-foreground">0,00€</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Σύνολο</Text>
                <Text className="text-lg font-bold text-foreground">111,60€</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity className="rounded-full bg-primary px-4 py-4">
            <Text className="text-center text-base font-semibold text-background">Επιβεβαίωση παραγγελίας</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
