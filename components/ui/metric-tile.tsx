import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";

type IconName = ComponentProps<typeof IconSymbol>["name"];

type MetricTileProps = {
  label: string;
  value: number | string;
  icon: IconName;
  /**
   * Hex/rgb color used both for the icon glyph and as the tinted background
   * of the icon circle (at ~10% alpha via the `1A` hex suffix).
   */
  tint: string;
};

/**
 * Half-width card that displays a single KPI (icon + big number + label).
 * Designed to live in a 2-column grid (`w-1/2` + wrap) so two tiles per row
 * line up with tight horizontal gutters.
 */
export function MetricTile({ label, value, icon, tint }: MetricTileProps) {
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="rounded-[20px] border border-border bg-surface px-4 py-4 gap-2">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${tint}1A` }}
        >
          <IconSymbol name={icon} size={18} color={tint} />
        </View>
        <Text className="text-[22px] font-bold text-foreground">{value}</Text>
        <Text className="text-xs font-medium text-muted">{label}</Text>
      </View>
    </View>
  );
}
