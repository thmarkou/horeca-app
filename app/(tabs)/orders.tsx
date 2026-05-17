import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, type FilterTab } from "@/components/ui/filter-tabs";
import { GatedAction } from "@/components/ui/gated-action";
import { StatusPill } from "@/components/ui/status-pill";
import { useBuyerActiveLocationPicker } from "@/hooks/use-buyer-active-location";
import { useColors } from "@/hooks/use-colors";
import { partitionOrdersByHistoryWindow } from "@/lib/order-history-window";
import { useRecentOrdersQuery, useMonthlyOrderUsageQuery } from "@/lib/horeca-queries";
import type { Order, OrderStatus } from "@/lib/mocks/horeca";
import { useFeatures } from "@/lib/subscription";

type OrderFilter = "active" | "history" | "all";

const ACTIVE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "Νέα",
  "Σε επεξεργασία",
  "Καθ' οδόν",
]);

const FILTER_DEFS: ReadonlyArray<{ key: OrderFilter; label: string }> = [
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
  const features = useFeatures();

  const { activeLocationId, showPicker, locations, setActiveLocationId } = useBuyerActiveLocationPicker();
  /** Free: ανεβάζουμε μέχρι το max του API για ακριβέστερο +N σε παλαιότερες. */
  const listFetchLimit =
    features.historyWindowDays === Number.POSITIVE_INFINITY ? 20 : 100;
  const { data: recentOrders = [], isLoading } = useRecentOrdersQuery({
    limit: listFetchLimit,
    locationId: activeLocationId,
  });
  const usageQuery = useMonthlyOrderUsageQuery();
  const usage = usageQuery.data;
  const [filter, setFilter] = useState<OrderFilter>("active");

  const { visibleOrders, hiddenOlderCount } = useMemo(
    () => partitionOrdersByHistoryWindow(recentOrders, features.historyWindowDays),
    [recentOrders, features.historyWindowDays],
  );

  const filterTabs = useMemo<ReadonlyArray<FilterTab<OrderFilter>>>(
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
              Δες τι εκκρεμεί, τι είναι καθ&apos; οδόν και ποια παραγγελία αξίζει να επαναλάβεις άμεσα.
            </Text>
          </View>

          {showPicker ? (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase text-muted">Ενεργό κατάστημα</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/locations")}>
                  <Text className="text-xs font-semibold text-primary">Διαχείριση</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {locations.map((loc) => {
                    const active = loc.id === activeLocationId;
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        onPress={() => setActiveLocationId(loc.id)}
                        className={`rounded-full border px-3 py-2 ${
                          active ? "border-primary bg-primary/10" : "border-border bg-surface"
                        }`}
                      >
                        <Text
                          numberOfLines={1}
                          className={`max-w-[200px] text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}
                        >
                          {loc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {/* Φάση 2.1: μηνιαίο όριο free buyer — ορατό Pro value + paywall CTA. */}
          {usageQuery.isLoading ? (
            <Text className="text-xs text-muted">Φόρτωση μηνιαίου ορίου…</Text>
          ) : usage ? (
            <View className="gap-3">
              {usage.isUnlimited ? (
                <View className="self-start rounded-full bg-primary/10 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-primary">Απεριόριστες παραγγελίες (Pro)</Text>
                </View>
              ) : usage.limit != null ? (
                <>
                  <View
                    className={`self-start rounded-full px-3 py-2 ${
                      usage.used >= usage.limit
                        ? "bg-error/15"
                        : usage.used >= 8
                          ? "bg-warning/15"
                          : "bg-surface"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        usage.used >= usage.limit
                          ? "text-error"
                          : usage.used >= 8
                            ? "text-warning"
                            : "text-foreground"
                      }`}
                    >
                      {usage.used} / {usage.limit} παραγγελίες αυτόν τον μήνα
                    </Text>
                  </View>
                  {usage.used >= 8 && usage.used < usage.limit ? (
                    <Text className="text-xs font-medium text-warning">Κοντά στο όριο</Text>
                  ) : null}
                  {usage.used >= usage.limit ? (
                    <View className="rounded-[24px] border border-warning/40 bg-warning/10 p-4">
                      <Text className="text-sm font-semibold text-foreground">
                        Έφτασες το μηνιαίο όριο
                      </Text>
                      <Text className="mt-1 text-xs leading-5 text-muted">
                        Με το δωρεάν πλάνο έχεις μέχρι {usage.limit} νέες παραγγελίες ανά μήνα. Οι νέες θα
                        ξεκλειδωθούν με την πρώτη μέρα του επόμενου μήνα· με Pro είναι απεριόριστες.
                      </Text>
                      <TouchableOpacity
                        onPress={() => router.push("/subscription")}
                        accessibilityRole="button"
                        className="mt-3 self-start rounded-full bg-primary px-4 py-2"
                      >
                        <Text className="text-sm font-semibold text-background">Δες τα πλάνα</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          <FilterTabs filters={filterTabs} active={filter} onChange={setFilter} />

          <GatedAction
            feature="canExportHistory"
            label="Εξαγωγή ιστορικού"
            iconName="arrow.right"
            variant="outline"
            paywallTitle="Εξαγωγή μόνο με Pro"
            paywallMessage="Το Pro ξεκλειδώνει εξαγωγή PDF/CSV για λογιστικό, παρέχοντας και πλήρες ιστορικό χωρίς όριο 30 ημερών."
            onUnlockedPress={() =>
              Alert.alert(
                "Εξαγωγή ιστορικού",
                "Σύντομα διαθέσιμη. Θα σταλεί στο email του λογαριασμού.",
              )
            }
          />

          <View className="gap-3 pb-2">
            {filtered.length === 0 ? (
              onlyOlderThanHistoryWindow ? (
                <EmptyState
                  icon={{ name: "clock.fill", color: colors.primary }}
                  title={`Ορατές οι τελευταίες ${features.historyWindowDays} ημέρες (δωρεάν)`}
                  body={`Δεν υπάρχουν εμφανίσιμες παραγγελίες σε αυτό το παράθυρο. Στον λογαριασμό σου υπάρχουν όμως παλαιότερες — ξεκλείδωσέ τες με το Pro (ενότητα παρακάτω).`}
                />
              ) : (
                <OrdersEmptyState
                  filter={filter}
                  isLoading={isLoading}
                  onPrimary={() => router.push("/suppliers")}
                  primaryIconColor={colors.primary}
                />
              )
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
                    <StatusPill status={order.status} />
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
                  Με το Pro βλέπεις όλο το ιστορικό στην εφαρμογή χωρίς όριο 30 ημερών και
                  ξεκλειδώνεις την εξαγωγή για το λογιστικό.
                </Text>
                <GatedAction
                  feature="unlimitedOrderHistory"
                  label="Δες τα πλάνα"
                  variant="primary"
                  paywallTitle="Πλήρες ιστορικό με Pro"
                  paywallMessage="Το Δωρεάν πλάνο δείχνει τις τελευταίες 30 ημέρες. Με το Pro βλέπεις όλες τις παραγγελίες και την εξαγωγή ιστορικού."
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
    <EmptyState
      icon={{ name: "bag.fill", color: primaryIconColor }}
      title={title}
      body={body}
      cta={{ label: cta, onPress: onPrimary }}
    />
  );
}
