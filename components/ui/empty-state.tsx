import type { ComponentProps } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";

type IconName = ComponentProps<typeof IconSymbol>["name"];

type EmptyStateProps = {
  /** Optional circle icon above the title. Defaults to primary-tinted bg. */
  icon?: {
    name: IconName;
    /** Icon tint color. Falls back to the primary color provided by the caller. */
    color: string;
  };
  title: string;
  body?: string;
  cta?: {
    label: string;
    onPress: () => void;
  };
};

/**
 * Dashed-border card used whenever a list or section has no items to show
 * (buyer home, buyer orders, supplier dashboard, supplier orders). Single
 * source of truth for spacing, typography and CTA button so these cards stay
 * visually consistent across both roles.
 */
export function EmptyState({ icon, title, body, cta }: EmptyStateProps) {
  return (
    <View className="rounded-[24px] border border-dashed border-border bg-surface/60 px-4 py-8 items-center gap-2">
      {icon ? (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <IconSymbol name={icon.name} size={22} color={icon.color} />
        </View>
      ) : null}
      <Text className="text-base font-semibold text-foreground">{title}</Text>
      {body ? <Text className="text-sm text-center leading-6 text-muted">{body}</Text> : null}
      {cta ? (
        <TouchableOpacity onPress={cta.onPress} className="mt-2 rounded-full bg-primary px-5 py-3">
          <Text className="text-sm font-semibold text-background">{cta.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
