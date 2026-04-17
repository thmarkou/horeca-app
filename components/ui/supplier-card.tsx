import { Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { Supplier } from "@/lib/mocks/horeca";

export interface SupplierCardProps {
  supplier: Supplier;
  onPress: () => void;
}

/**
 * Returns up to 2 uppercase initials from the supplier name, skipping
 * single-character connector words (e.g. "&") so "A & B Coffee" → "AB"
 * instead of "A&".
 */
function getInitials(name: string): string {
  const tokens = name
    .split(/\s+/)
    .filter((token) => token.length > 1 || /\p{L}/u.test(token.charAt(0)));
  if (tokens.length === 0) return name.slice(0, 2).toUpperCase();
  const first = tokens[0].charAt(0);
  const second = tokens[1]?.charAt(0) ?? tokens[0].charAt(1) ?? "";
  return `${first}${second}`.toUpperCase();
}

/**
 * B2 supplier list card. Used both in the buyer suppliers tab and (later)
 * in favorites. Visual hierarchy:
 *   avatar + name/rating row  →  highlight tagline  →  meta row  →  CTA
 */
export function SupplierCard({ supplier, onPress }: SupplierCardProps) {
  const colors = useColors();
  const initials = getInitials(supplier.name);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Άνοιγμα προφίλ: ${supplier.name}`}
      className="rounded-[24px] border border-border bg-surface p-4"
    >
      <View className="flex-row items-start gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-base font-bold text-primary">{initials}</Text>
        </View>

        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="flex-1 text-base font-semibold text-foreground"
              numberOfLines={1}
            >
              {supplier.name}
            </Text>
            {supplier.verified ? (
              <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-1">
                <IconSymbol name="checkmark.seal.fill" size={12} color={colors.success} />
                <Text className="text-[11px] font-semibold text-success">Εξακριβωμένος</Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center gap-1">
            <IconSymbol name="star.fill" size={13} color={colors.warning} />
            <Text className="text-sm font-semibold text-foreground">
              {supplier.rating.toFixed(1)}
            </Text>
            <Text className="text-sm text-muted">· {supplier.category}</Text>
          </View>
        </View>
      </View>

      <Text className="mt-3 text-sm leading-6 text-foreground">{supplier.highlight}</Text>

      <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <View className="flex-row items-center gap-1">
          <IconSymbol name="mappin.and.ellipse" size={13} color={colors.muted} />
          <Text className="text-xs font-medium text-muted">{supplier.location}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <IconSymbol name="clock.fill" size={13} color={colors.muted} />
          <Text className="text-xs font-medium text-muted">{supplier.deliveryTime}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <IconSymbol name="shippingbox.fill" size={13} color={colors.muted} />
          <Text className="text-xs font-medium text-muted">MOQ {supplier.minimumOrder}</Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-border pt-3">
        <Text className="text-sm font-semibold text-primary">Άνοιγμα καταλόγου</Text>
        <IconSymbol name="chevron.right" size={16} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}
