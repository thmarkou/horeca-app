import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, type FilterTab } from "@/components/ui/filter-tabs";
import { GatedAction } from "@/components/ui/gated-action";
import { StatusPill } from "@/components/ui/status-pill";
import { useColors } from "@/hooks/use-colors";
import { partitionOrdersByHistoryWindow } from "@/lib/order-history-window";
import { useRecentOrdersQuery } from "@/lib/horeca-queries";
import type { Order, OrderStatus } from "@/lib/mocks/horeca";
import { useFeatures } from "@/lib/subscription";

type SupplierOrderFilter = "new" | "processing" | "onTheWay" | "completed" | "all";

const FILTER_DEFS: ReadonlyArray<{ key: SupplierOrderFilter; label: string }> = [
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
  const features = useFeatures();
  const listFetchLimit =
    features.historyWindowDays === Number.POSITIVE_INFINITY ? 20 : 100;
  const { data: recentOrders = [], isLoading } = useRecentOrdersQuery({
    limit: listFetchLimit,
  });
  const [filter, setFilter] = useState<SupplierOrderFilter>("new");

  const { visibleOrders, hiddenOlderCount } = useMemo(
    () => partitionOrdersByHistoryWindow(recentOrders, features.historyWindowDays),
    [recentOrders, features.historyWindowDays],
  );

  const filterTabs = useMemo<ReadonlyArray<FilterTab<SupplierOrderFilter>>>(
    () =>
      FILTER_DEFS.map((f) => ({
        key: f.key,
        label: f.label,
        count: visibleOrders.filter((o) => matchesFilter(o, f.key)).length,
      })),
    [visibleOrders],
  );

  const filtered = useMemo(
    () => visibleOrders.filter((o) => matchesFilter(o, filter)),
    [visibleOrders, filter],
  );

  const showHistoryPaywall =
    hiddenOlderCount > 0 && features.historyWindowDays < Number.POSITIVE_INFINITY;

  const onlyOlderThanHistoryWindow =
    !isLoading &&
    recentOrders.length > 0 &&
    visibleOrders.length === 0 &&
    showHistoryPaywall;

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

          <FilterTabs filters={filterTabs} active={filter} onChange={setFilter} scrollable />

          <View className="gap-3 pb-2">
            {filtered.length === 0 ? (
              onlyOlderThanHistoryWindow ? (
                <EmptyState
                  icon={{ name: "clock.fill", color: colors.primary }}
                  title={`Ορατές οι τελευταίες ${features.historyWindowDays} ημέρες (δωρεάν)`}
                  body={`Δεν υπάρχουν εμφανίσιμες παραγγελίες σε αυτό το παράθυρο. Υπάρχουν όμως παλαιότερες που ξεκλειδώνονται με το Pro.`}
                />
              ) : (
                <SupplierOrdersEmptyState
                  filter={filter}
                  isLoading={isLoading}
                  iconColor={colors.primary}
                />
              )
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
            {showHistoryPaywall ? (
              <View className="rounded-[24px] border border-primary/25 bg-primary/5 p-4 gap-3">
                <Text className="text-sm font-semibold text-foreground">
                  +{hiddenOlderCount}{" "}
                  {hiddenOlderCount === 1
                    ? "παλαιότερη παραγγελία"
                    : "παλαιότερες παραγγελίες"}{" "}
                  (εκτός των τελευταίων {features.historyWindowDays} ημερών)
                </Text>
                <Text className="text-xs leading-5 text-muted">
                  Με το Pro βλέπεις όλο το ιστορικό στην εφαρμογή χωρίς το όριο 30 ημερών.
                </Text>
                <GatedAction
                  feature="unlimitedOrderHistory"
                  label="Δες τα πλάνα"
                  variant="primary"
                  paywallTitle="Πλήρες ιστορικό με Pro"
                  paywallMessage="Το Δωρεάν πλάνο δείχνει τις τελευταίες 30 ημέρες ως προς τη λίστα παραγγελιών."
                  onUnlockedPress={() => router.push("/subscription")}
                />
              </View>
            ) : null}
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
