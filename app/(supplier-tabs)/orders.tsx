import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { StatusPill } from "@/components/ui/status-pill";
import { useColors } from "@/hooks/use-colors";
import { useRecentOrdersQuery } from "@/lib/horeca-queries";
import type { Order, OrderStatus } from "@/lib/mocks/horeca";

type SupplierOrderFilter = "new" | "processing" | "onTheWay" | "completed" | "all";

const FILTERS: ReadonlyArray<{ key: SupplierOrderFilter; label: string }> = [
  { key: "new", label: "Νέες" },
  { key: "processing", label: "Σε επεξεργασία" },
  { key: "onTheWay", label: "Καθ' οδόν" },
  { key: "completed", label: "Ολοκληρωμένες" },
  { key: "all", label: "Όλες" },
];

const STATUS_FOR_FILTER: Record<Exclude<SupplierOrderFilter, "all">, OrderStatus> = {
  new: "Νέα",
  processing: "Σε επεξεργασία",
  onTheWay: "Καθ' οδόν",
  completed: "Ολοκληρώθηκε",
};

function matchesFilter(order: Order, filter: SupplierOrderFilter): boolean {
  if (filter === "all") return true;
  return order.status === STATUS_FOR_FILTER[filter];
}

export default function SupplierOrdersTabScreen() {
  const router = useRouter();
  const colors = useColors();
  const { data: recentOrders = [], isLoading } = useRecentOrdersQuery({ limit: 20 });
  const [filter, setFilter] = useState<SupplierOrderFilter>("new");

  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<SupplierOrderFilter, number>>(
        (acc, f) => {
          acc[f.key] = recentOrders.filter((o) => matchesFilter(o, f.key)).length;
          return acc;
        },
        { new: 0, processing: 0, onTheWay: 0, completed: 0, all: 0 },
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
              Νέες και ενεργές παραγγελίες από καταστήματα — προτεραιότητα στον χρόνο παράδοσης.
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 4 }}
          >
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
          </ScrollView>

          <View className="gap-3 pb-2">
            {filtered.length === 0 ? (
              <SupplierOrdersEmptyState
                filter={filter}
                isLoading={isLoading}
                iconColor={colors.primary}
              />
            ) : (
              filtered.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() =>
                    router.push({ pathname: "/order-detail", params: { id: order.id } })
                  }
                  className="rounded-[24px] border border-border bg-surface p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground">
                        {order.counterpartyName}
                      </Text>
                      <Text className="text-sm text-muted">
                        {order.id} · {order.itemCount} είδη
                      </Text>
                    </View>
                    <StatusPill status={order.status} />
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-sm text-muted">{order.deliveryWindow}</Text>
                    <Text className="text-base font-bold text-foreground">{order.total}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

type SupplierOrdersEmptyStateProps = {
  filter: SupplierOrderFilter;
  isLoading: boolean;
  iconColor: string;
};

function SupplierOrdersEmptyState({ filter, isLoading, iconColor }: SupplierOrdersEmptyStateProps) {
  if (isLoading) {
    return (
      <View className="rounded-[24px] border border-dashed border-border bg-surface/60 px-4 py-10 items-center">
        <Text className="text-sm text-muted">Φόρτωση παραγγελιών…</Text>
      </View>
    );
  }

  const copy: Record<SupplierOrderFilter, { title: string; body: string }> = {
    new: {
      title: "Καμία νέα παραγγελία",
      body: "Όταν έρθουν νέες παραγγελίες από καταστήματα θα εμφανιστούν εδώ άμεσα.",
    },
    processing: {
      title: "Τίποτα σε επεξεργασία",
      body: "Δεν υπάρχουν παραγγελίες σε εξέλιξη αυτή τη στιγμή.",
    },
    onTheWay: {
      title: "Καμία αποστολή σε πορεία",
      body: "Όταν ξεκινήσει μεταφορά, θα την δεις εδώ μέχρι να παραδοθεί.",
    },
    completed: {
      title: "Δεν υπάρχει ιστορικό",
      body: "Οι ολοκληρωμένες παραγγελίες θα εμφανίζονται εδώ ως αρχείο.",
    },
    all: {
      title: "Δεν υπάρχουν παραγγελίες",
      body: "Μόλις έρθουν οι πρώτες παραγγελίες, θα εμφανιστούν εδώ.",
    },
  };
  const { title, body } = copy[filter];

  return <EmptyState icon={{ name: "bag.fill", color: iconColor }} title={title} body={body} />;
}
