import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function ProductDetailScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 justify-between gap-6 pt-2">
        <View className="gap-5">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">Aegean Coffee Trade</Text>
            <Text className="mt-2 text-[28px] font-bold leading-8 text-foreground">Brazil Santos Espresso Blend</Text>
            <Text className="mt-3 text-base leading-7 text-muted">
              Χαρμάνι για espresso με ισορροπημένο σώμα, σοκολατένιες νότες και σταθερή απόδοση σε επαγγελματικό εξοπλισμό.
            </Text>
            <View className="mt-5 flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-muted">Συσκευασία</Text>
                <Text className="text-base font-semibold text-foreground">1 κιλό</Text>
              </View>
              <View>
                <Text className="text-sm text-muted">Τιμή</Text>
                <Text className="text-base font-semibold text-foreground">18,90€</Text>
              </View>
              <View>
                <Text className="text-sm text-muted">Διαθεσιμότητα</Text>
                <Text className="text-base font-semibold text-success">Άμεσα διαθέσιμο</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="gap-3 pb-4">
          <TouchableOpacity onPress={() => router.push("/cart")} className="rounded-full bg-primary px-4 py-4">
            <Text className="text-center text-base font-semibold text-background">Προσθήκη στο καλάθι</Text>
          </TouchableOpacity>
          <TouchableOpacity className="rounded-full border border-border bg-surface px-4 py-4">
            <Text className="text-center text-base font-semibold text-foreground">Αποθήκευση στα αγαπημένα</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
