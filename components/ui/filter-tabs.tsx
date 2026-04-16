import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export type FilterTab<K extends string> = {
  key: K;
  label: string;
  count: number;
};

type FilterTabsProps<K extends string> = {
  filters: ReadonlyArray<FilterTab<K>>;
  active: K;
  onChange: (key: K) => void;
  /**
   * When filters overflow a single row (5+ tabs like the supplier orders
   * screen), render them in a horizontally scrollable container. Default
   * `false` — filters sit in a `flex-row` and must fit naturally.
   */
  scrollable?: boolean;
};

/**
 * Segmented chip control used above order lists (buyer & supplier). Each chip
 * shows a label and a live count badge. Visual styling lives here so buyer and
 * supplier tabs never drift apart.
 *
 * Generic `K` keeps the screen's filter enum strict through props (e.g.
 * `OrderFilter` vs `SupplierOrderFilter`).
 */
export function FilterTabs<K extends string>({
  filters,
  active,
  onChange,
  scrollable = false,
}: FilterTabsProps<K>) {
  const chips = filters.map((f) => {
    const isActive = active === f.key;
    return (
      <TouchableOpacity
        key={f.key}
        onPress={() => onChange(f.key)}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        className={`flex-row items-center gap-2 rounded-full px-4 py-2 ${
          isActive ? "bg-primary" : "border border-border bg-surface"
        }`}
      >
        <Text
          className={`text-sm font-semibold ${isActive ? "text-background" : "text-foreground"}`}
        >
          {f.label}
        </Text>
        <View
          className={`min-w-6 items-center rounded-full px-2 py-0.5 ${
            isActive ? "bg-background/20" : "bg-background"
          }`}
        >
          <Text
            className={`text-xs font-bold ${isActive ? "text-background" : "text-muted"}`}
          >
            {f.count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {chips}
      </ScrollView>
    );
  }

  return <View className="flex-row gap-2">{chips}</View>;
}
