import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, type FilterTab } from "@/components/ui/filter-tabs";
import { GatedAction } from "@/components/ui/gated-action";
import { StatusPill } from "@/components/ui/status-pill";
import { useColors } from "@/hooks/use-colors";
import { useRecentOrdersQuery } from "@/lib/horeca-queries";
import type { Order, OrderStatus } from "@/lib/mocks/horeca";

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
  const { data: recentOrders = [], isLoading } = useRecentOrdersQuery({ limit: 20 });
  const [filter, setFilter] = useState<OrderFilter>("active");

  const filterTabs = useMemo<ReadonlyArray<FilterTab<OrderFilter>>>(
    () =>
      FILTER_DEFS.map((f) => ({
        key: f.key,
        label: f.label,
        count: recentOrders.filter((o) => matchesFilter(o, f.key)).length,
      })),
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
