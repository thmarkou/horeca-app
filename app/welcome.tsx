import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type IconName = ComponentProps<typeof IconSymbol>["name"];

type RoleBenefit = {
  title: string;
  icon: IconName;
  tagline: string;
  bullets: readonly string[];
};

// Role-specific value props shown side-by-side so ένας καταστηματάρχης και ένας
// προμηθευτής να βλέπουν από την πρώτη οθόνη γιατί αξίζει να κατεβάσουν το app.
const ROLE_BENEFITS: readonly RoleBenefit[] = [
  {
    title: "Για καταστήματα",
    icon: "bag.fill",
    tagline: "Κέντρο αγορών για καφετέριες, εστιατόρια και mini markets.",
    bullets: [
      "Βρες προμηθευτές και τιμές σε λίγα λεπτά",
      "Επανάλαβε τις καθημερινές σου παραγγελίες με ένα tap",
      "Κράτα ιστορικό παραδόσεων και κόστους σε ένα σημείο",
    ],
  },
  {
    title: "Για προμηθευτές",
    icon: "shippingbox.fill",
    tagline: "Εργαλείο ημέρας για να δουλεύεις εν κινήσει.",
    bullets: [
      "Δες νέες παραγγελίες σε πραγματικό χρόνο",
      "Διαχειρίσου την πορεία κάθε παραγγελίας από το κινητό",
      "Παρακολούθησε τζίρο και απόθεμα χωρίς λογιστικά φύλλα",
    ],
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, gap: 32 }}
        >
          <View className="gap-5">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Text className="text-xl font-bold text-primary">HS</Text>
            </View>
            <View className="gap-3">
              <Text className="text-[32px] font-bold leading-10 text-foreground">
                Μία εφαρμογή για όλη την αλυσίδα προμηθειών στην εστίαση.
              </Text>
              <Text className="text-base leading-7 text-muted">
                Ίδιο app, δύο κόσμοι: καταστηματάρχες που αναζητούν προμηθευτές και προμηθευτές που χειρίζονται παραγγελίες εν κινήσει.
              </Text>
            </View>
          </View>

          <View className="gap-4">
            {ROLE_BENEFITS.map((benefit) => (
              <View
                key={benefit.title}
                className="gap-4 rounded-[28px] border border-border bg-surface p-5"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <IconSymbol name={benefit.icon} size={22} color={colors.primary} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-semibold text-foreground">{benefit.title}</Text>
                    <Text className="text-sm leading-5 text-muted">{benefit.tagline}</Text>
                  </View>
                </View>

                <View className="gap-3">
                  {benefit.bullets.map((bullet) => (
                    <View key={bullet} className="flex-row items-start gap-3">
                      <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                        <IconSymbol name="checkmark.circle.fill" size={14} color={colors.primary} />
                      </View>
                      <Text className="flex-1 text-sm leading-6 text-foreground">{bullet}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View className="gap-3 border-t border-border bg-background px-5 pt-4 pb-4">
          <TouchableOpacity
            onPress={() => router.push("/sign-up")}
            accessibilityRole="button"
            className="rounded-full bg-primary px-4 py-4"
          >
            <Text className="text-center text-base font-semibold text-background">Ξεκίνα τώρα</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/sign-in")}
            accessibilityRole="button"
            className="rounded-full border border-border bg-surface px-4 py-4"
          >
            <Text className="text-center text-base font-semibold text-foreground">Έχω ήδη λογαριασμό</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            accessibilityRole="button"
          >
            <Text className="text-center text-sm font-semibold text-muted">Προβολή demo εμπειρίας</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
