import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function CartScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 justify-between gap-6 pt-2">
        <View className="gap-5">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="gap-3 rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Καλάθι</Text>
            <Text className="text-base leading-6 text-muted">
              Έλεγχος ειδών, χρόνου παράδοσης και συνολικού κόστους πριν την τελική επιβεβαίωση.
            </Text>

            <View className="rounded-[24px] border border-border bg-background p-4">
              <Text className="text-base font-semibold text-foreground">Brazil Santos Espresso Blend</Text>
              <Text className="mt-1 text-sm text-muted">4 τεμ. · 1 κιλό</Text>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-sm text-muted">Aegean Coffee Trade</Text>
                <Text className="text-base font-bold text-foreground">75,60€</Text>
              </View>
            </View>

            <View className="rounded-[24px] border border-border bg-background p-4">
              <Text className="text-base font-semibold text-foreground">Ποτήρι χάρτινο διπλό 12oz</Text>
              <Text className="mt-1 text-sm text-muted">10 packs · 50 τεμ.</Text>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-sm text-muted">Blue Pack Essentials</Text>
                <Text className="text-base font-bold text-foreground">36,00€</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="gap-3 pb-4">
          <View className="rounded-[24px] border border-border bg-background p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted">Υποσύνολο</Text>
              <Text className="text-base font-semibold text-foreground">111,60€</Text>
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-sm text-muted">Εκτιμώμενη παράδοση</Text>
              <Text className="text-base font-semibold text-foreground">Αύριο 08:00–11:00</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/checkout")} className="rounded-full bg-primary px-4 py-4">
            <Text className="text-center text-base font-semibold text-background">Συνέχεια στο checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
