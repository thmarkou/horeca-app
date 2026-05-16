import { Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export interface StarRatingProps {
  /**
   * Rating στην κλίμακα 0–5 (όπως το βλέπει ο user). Το backend κρατά ως
   * integer × 10 (π.χ. 48 = 4.8) — το mapping γίνεται στο `mapSupplierRow`,
   * εμείς εδώ δεχόμαστε το friendly value.
   */
  rating: number;
  /** Επιλέξιμο μέγεθος (visual sm/md). Στις cards θέλουμε `sm`, στο hero `md`. */
  size?: "sm" | "md";
  /**
   * Όταν `true`, εμφανίζουμε pill «Νέος» αντί για άστρα. Χρήσιμο για suppliers
   * που μόλις εγγράφηκαν (rating === 0) ώστε να μη δείχνουν fake «0.0».
   */
  isNew?: boolean;
}

const TOTAL_STARS = 5;

/**
 * Συμπαγής star bar που δείχνει 5 «κενά» αστέρια και από πάνω overlay-άρει
 * `Math.round(rating)` γεμάτα (★★★★☆ pattern). Συνοδεύεται από numeric label
 * για ακρίβεια — οι buyers στο B2B θέλουν να βλέπουν και 4.7 vs 4.9, όχι μόνο
 * «4 αστέρια».
 *
 * Για suppliers χωρίς rating ακόμη (Phase 0.6 defaults), περνάει `isNew` και
 * αντί για zero stars δείχνουμε ξεκάθαρο «Νέος» badge.
 */
export function StarRating({ rating, size = "sm", isNew = false }: StarRatingProps) {
  const colors = useColors();
  const iconSize = size === "md" ? 16 : 13;
  const textClass =
    size === "md" ? "text-base font-semibold text-foreground" : "text-sm font-semibold text-foreground";

  if (isNew) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel="Νέος προμηθευτής χωρίς αξιολογήσεις ακόμη"
        className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-1"
      >
        <IconSymbol name="star.circle.fill" size={iconSize} color={colors.primary} />
        <Text className="text-[11px] font-semibold text-primary">Νέος</Text>
      </View>
    );
  }

  const filled = Math.round(Math.min(Math.max(rating, 0), TOTAL_STARS));

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Βαθμολογία ${rating.toFixed(1)} από ${TOTAL_STARS}`}
      className="flex-row items-center gap-1"
    >
      <View className="flex-row items-center">
        {Array.from({ length: TOTAL_STARS }, (_, i) => (
          <IconSymbol
            key={i}
            name="star.fill"
            size={iconSize}
            // Filled stars τονίζονται σε warning (golden) — τα empty πέφτουν
            // στο border tone ώστε να είναι ευδιάκριτα αλλά διακριτικά.
            color={i < filled ? colors.warning : colors.border}
          />
        ))}
      </View>
      <Text className={textClass}>{rating.toFixed(1)}</Text>
    </View>
  );
}
