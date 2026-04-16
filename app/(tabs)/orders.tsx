import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRecentOrdersQuery } from "@/lib/horeca-queries";
import type { Order, OrderStatus } from "@/lib/mocks/horeca";
import { getOrderStatusClasses } from "@/lib/order-status-styles";

type OrderFilter = "active" | "history" | "all";

const ACTIVE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "Νέα",
  "Σε επεξεργασία",
  "Καθ' οδόν",
]);

const FILTERS: ReadonlyArray<{ key: OrderFilter; label: string }> = [
  { key: "active", label: "Ενεργές" },
  { key: "history", label: "Ιστορικό" },
  { key: "all", label: "Όλες" },
];

function matchesFilter(order: Order, filter: OrderFilter): boolean {
  switch (filter) {
    case "active":
      return ACTIVE_STATUSES.has(order.status);
    case "history":
      return order.status === "Ολοκληρώθηκε";
    case "all":
      return true;
  }
}

export default function OrdersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { data: recentOrders = [], isLoading } = useRecentOrdersQuery({ limit: 20 });
  const [filter, setFilter] = useState<OrderFilter>("active");

  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<OrderFilter, number>>(
        (acc, f) => {
          acc[f.key] = recentOrders.filter((o) => matchesFilter(o, f.key)).length;
          return acc;
        },
        { active: 0, history: 0, all: 0 },
      ),
    [recentOrders],
  );

  const filtered = useMemo(
    () => recentOrders.filter((o) => matchesFilter(o, filter)),
    [recentOrders, filter],
  );

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 gap-5">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Παραγγελίες</Text>
            <Text className="text-base leading-6 text-muted">
              Δες τι εκκρεμεί, τι είναι καθ&apos; οδόν και ποια παραγγελία αξίζει να επαναλάβεις άμεσα.
            </Text>
          </View>

          <View className="flex-row gap-2">
            {FILTERS.map((f) => {
              const isActive = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
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
                      {counts[f.key]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="gap-3 pb-2">
            {filtered.length === 0 ? (
              <OrdersEmptyState
                filter={filter}
                isLoading={isLoading}
                onPrimary={() => router.push("/suppliers")}
                primaryIconColor={colors.primary}
              />
            ) : (
              filtered.map((order) => (
                <View key={order.id} className="rounded-[24px] border border-border bg-surface p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground">{order.supplierName}</Text>
                      <Text className="text-sm text-muted">
                        {order.id} · {order.itemCount} είδη
                      </Text>
                    </View>
                    <View className={`rounded-full px-3 py-2 ${getOrderStatusClasses(order.status)}`}>
                      <Text className="text-xs font-semibold">{order.status}</Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-sm text-muted">Παράδοση: {order.deliveryWindow}</Text>
                  <View className="mt-4 flex-row items-center justify-between gap-3">
                    <Text className="text-lg font-bold text-foreground">{order.total}</Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() =>
                          router.push({ pathname: "/order-detail", params: { id: order.id } })
                        }
                        className="rounded-full border border-border bg-background px-4 py-2"
                      >
                        <Text className="text-sm font-semibold text-foreground">Λεπτομέρειες</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => router.push("/cart")}
                        className="rounded-full bg-primary px-4 py-2"
                      >
                        <Text className="text-sm font-semibold text-background">Επανάληψη</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

type OrdersEmptyStateProps = {
  filter: OrderFilter;
  isLoading: boolean;
  onPrimary: () => void;
  primaryIconColor: string;
};

function OrdersEmptyState({
  filter,
  isLoading,
  onPrimary,
  primaryIconColor,
}: OrdersEmptyStateProps) {
  if (isLoading) {
    return (
      <View className="rounded-[24px] border border-dashed border-border bg-surface/60 px-4 py-10 items-center">
        <Text className="text-sm text-muted">Φόρτωση παραγγελιών…</Text>
      </View>
    );
  }

  const copy: Record<OrderFilter, { title: string; body: string; cta: string }> = {
    active: {
      title: "Καμία ενεργή παραγγελία",
      body: "Όταν δημιουργήσεις νέα παραγγελία θα εμφανίζεται εδώ σε πραγματικό χρόνο.",
      cta: "Αναζήτηση προμηθευτών",
    },
    history: {
      title: "Δεν υπάρχει ακόμη ιστορικό",
      body: "Μόλις ολοκληρωθούν οι πρώτες σου παραδόσεις θα καταγράφονται εδώ.",
      cta: "Ξεκίνα παραγγελία",
    },
    all: {
      title: "Δεν έχεις ακόμη παραγγελίες",
      body: "Ξεκίνα από τους προτεινόμενους προμηθευτές ή αναζήτησε αυτό που χρειάζεσαι.",
      cta: "Αναζήτηση προμηθευτών",
    },
  };
  const { title, body, cta } = copy[filter];

  return (
    <View className="rounded-[24px] border border-dashed border-border bg-surface/60 px-4 py-8 items-center gap-2">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <IconSymbol name="bag.fill" size={22} color={primaryIconColor} />
      </View>
      <Text className="text-base font-semibold text-foreground">{title}</Text>
      <Text className="text-sm text-center leading-6 text-muted">{body}</Text>
      <TouchableOpacity onPress={onPrimary} className="mt-2 rounded-full bg-primary px-5 py-3">
        <Text className="text-sm font-semibold text-background">{cta}</Text>
      </TouchableOpacity>
    </View>
  );
}
