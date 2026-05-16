import { Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

type QtyStepperProps = {
  value: number;
  onChange: (next: number) => void;
  /** Min επιτρεπτή τιμή (default 1). Χρήσιμο για product-detail όπου qty=0 δεν έχει νόημα. */
  min?: number;
  /** Max επιτρεπτή τιμή (default 999). Πιθανώς θα συνδεθεί με stock σε Φάση 3. */
  max?: number;
  /**
   * Αν true, το «-» button στο `min` αφαιρεί το item αντί να γίνεται disabled.
   * Χρήσιμο στο cart screen για άμεσο delete με μία ενέργεια.
   */
  removeOnMin?: boolean;
  onRemove?: () => void;
  size?: "sm" | "md";
};

/**
 * Reusable +/- ποσότητας με βελτιωμένο tap target (≥44px height). Χρησιμοποιείται
 * στο product-detail (για add-to-cart με αρχική ποσότητα) και στο cart screen
 * (για inline edit). Η εμφάνιση ελέγχεται από `size`.
 */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  removeOnMin = false,
  onRemove,
  size = "md",
}: QtyStepperProps) {
  const colors = useColors();
  const iconSize = size === "sm" ? 16 : 18;
  const button = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const label = size === "sm" ? "text-sm" : "text-base";
  const decrementDisabled = value <= min && !removeOnMin;
  const incrementDisabled = value >= max;

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
      return;
    }
    if (removeOnMin && onRemove) {
      onRemove();
    }
  };

  return (
    <View className="flex-row items-center gap-2">
      <TouchableOpacity
        onPress={handleDecrement}
        disabled={decrementDisabled}
        accessibilityRole="button"
        accessibilityLabel="Μείωση ποσότητας"
        className={cn(
          "items-center justify-center rounded-full border border-border bg-surface",
          button,
          decrementDisabled && "opacity-40",
        )}
      >
        <IconSymbol
          name={removeOnMin && value <= min ? "trash.fill" : "minus"}
          size={iconSize}
          color={colors.foreground}
        />
      </TouchableOpacity>

      <Text
        className={cn("min-w-[2.5rem] text-center font-semibold text-foreground", label)}
        accessibilityLabel={`Ποσότητα ${value}`}
      >
        {value}
      </Text>

      <TouchableOpacity
        onPress={() => onChange(value + 1)}
        disabled={incrementDisabled}
        accessibilityRole="button"
        accessibilityLabel="Αύξηση ποσότητας"
        className={cn(
          "items-center justify-center rounded-full border border-border bg-surface",
          button,
          incrementDisabled && "opacity-40",
        )}
      >
        <IconSymbol name="plus" size={iconSize} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}
