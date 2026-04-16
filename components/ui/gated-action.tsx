import { useRouter } from "expo-router";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useFeatures } from "@/lib/subscription";

type GateFeature =
  | "canExportHistory"
  | "canSetPriceAlerts"
  | "canCompareCosts"
  | "prioritySupport";

/**
 * Generic «κλειδωμένη» ενέργεια: αν ο user έχει το feature, καλεί το `onPress`·
 * αλλιώς δείχνει Alert με CTA που στέλνει στην οθόνη συνδρομής. Κάνει το
 * gating declarative — η parent δεν χρειάζεται να ξέρει τίποτα για plan/status.
 *
 * Το lock badge εμφανίζεται ΜΟΝΟ όταν η ενέργεια είναι κλειδωμένη, ώστε οι
 * pro users να δουν καθαρή CTA χωρίς distraction.
 */
export function GatedAction({
  feature,
  label,
  onUnlockedPress,
  iconName,
  variant = "primary",
  paywallTitle,
  paywallMessage,
}: {
  feature: GateFeature;
  label: string;
  onUnlockedPress: () => void;
  iconName?: React.ComponentProps<typeof IconSymbol>["name"];
  variant?: "primary" | "outline";
  paywallTitle?: string;
  paywallMessage?: string;
}) {
  const features = useFeatures();
  const colors = useColors();
  const router = useRouter();
  const isUnlocked = features[feature];

  const handlePress = () => {
    if (isUnlocked) {
      onUnlockedPress();
      return;
    }
    Alert.alert(
      paywallTitle ?? "Διαθέσιμο με Pro",
      paywallMessage ?? "Αναβάθμισε σε Pro για να ξεκλειδώσεις αυτή τη λειτουργία.",
      [
        { text: "Άκυρο", style: "cancel" },
        { text: "Δες τα πλάνα", onPress: () => router.push("/subscription") },
      ],
    );
  };

  const baseClass =
    variant === "primary"
      ? "flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 py-3"
      : "flex-row items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-3";
  const textClass =
    variant === "primary"
      ? "text-sm font-semibold text-background"
      : "text-sm font-semibold text-foreground";
  const iconColor = variant === "primary" ? colors.background : colors.foreground;

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={isUnlocked ? label : `${label} (απαιτεί Pro)`}
      accessibilityState={{ disabled: false }}
      className={baseClass}
    >
      {iconName ? <IconSymbol name={iconName} size={16} color={iconColor} /> : null}
      <Text className={textClass}>{label}</Text>
      {!isUnlocked ? (
        <View className="ml-1 rounded-full bg-warning/20 px-2 py-[2px]">
          <View className="flex-row items-center gap-1">
            <IconSymbol name="lock.fill" size={10} color={colors.warning} />
            <Text className="text-[10px] font-bold uppercase text-warning">Pro</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
