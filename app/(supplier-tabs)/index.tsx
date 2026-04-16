import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { MetricTile } from "@/components/ui/metric-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { useColors } from "@/hooks/use-colors";
import * as Auth from "@/lib/_core/auth";
import { getFirstName, getGreetingForDate } from "@/lib/greeting";
import {
  useRecentOrdersQuery,
  useSupplierOperationalSummaryQuery,
} from "@/lib/horeca-queries";
import type { OrderStatus } from "@/lib/mocks/horeca";

const PREVIEW_EXCLUDE: ReadonlySet<OrderStatus> = new Set<OrderStatus>(["Ολοκληρώθηκε"]);

function newOrdersCopy(count: number): string {
  if (count === 0) return "Δεν υπάρχουν νέες παραγγελίες αυτή τη στιγμή.";
  if (count === 1) return "1 νέα παραγγελία περιμένει την επιβεβαίωσή σου.";
  return `${count} νέες παραγγελίες περιμένουν την επιβεβαίωσή σου.`;
}

export default function SupplierDashboardTabScreen() {
  const router = useRouter();
  const colors = useColors();

  const [userName, setUserName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await Auth.getUserInfo();
      if (!cancelled) setUserName(u?.name ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: summary } = useSupplierOperationalSummaryQuery();
  const { data: recentOrders = [] } = useRecentOrdersQuery({ limit: 20 });

  const greeting = getGreetingForDate();
  const firstName = getFirstName(userName);

  const upcoming = useMemo(
    () => recentOrders.filter((o) => !PREVIEW_EXCLUDE.has(o.status)).slice(0, 3),
    [recentOrders],
  );

  const newOrdersCount = summary?.newOrders ?? 0;
  const showNewOrdersHero = newOrdersCount > 0;

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 pb-6 gap-6">
          <View className="gap-2">
            <Text className="text-sm font-medium text-muted">
              {greeting}, {firstName}
            </Text>
            <Text className="text-[28px] font-bold leading-8 text-foreground">
              Σύνοψη ημέρας προμηθευτή.
            </Text>
            <Text className="text-base leading-6 text-muted">
              Νέες παραγγελίες, επεξεργασία, αποστολές και τζίρος — όλα σε μία οθόνη.
            </Text>
          </View>

          {showNewOrdersHero ? (
            <View className="rounded-[28px] bg-primary px-5 py-5">
              <Text className="text-sm font-semibold text-background/80">Απαιτείται ενέργεια</Text>
              <Text className="mt-2 text-2xl font-bold leading-8 text-background">
                {newOrdersCopy(newOrdersCount)}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(supplier-tabs)/orders")}
                className="mt-5 self-start rounded-full bg-background px-5 py-3"
              >
                <Text className="text-sm font-semibold text-primary">Δες τις νέες</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Επισκόπηση</Text>
            <View className="flex-row flex-wrap -mx-1">
              <MetricTile
                label="Νέες παραγγελίες"
                value={summary?.newOrders ?? 0}
                icon="bag.fill"
                tint={colors.primary}
              />
              <MetricTile
                label="Σε επεξεργασία"
                value={summary?.processingOrders ?? 0}
                icon="clock.fill"
                tint={colors.warning}
              />
              <MetricTile
                label="Χαμηλό απόθεμα"
                value={summary?.lowStockItems ?? 0}
                icon="shippingbox.fill"
                tint={colors.warning}
              />
              <MetricTile
                label="Τζίρος ημέρας"
                value={summary?.todayRevenue ?? "—"}
                icon="checkmark.circle.fill"
                tint={colors.success}
              />
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Επόμενες παραδόσεις</Text>
              <TouchableOpacity onPress={() => router.push("/(supplier-tabs)/orders")}>
                <Text className="text-sm font-semibold text-primary">Όλες</Text>
              </TouchableOpacity>
            </View>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={{ name: "checkmark.circle.fill", color: colors.success }}
                title="Δεν υπάρχουν εκκρεμείς παραδόσεις"
                body="Όλες οι παραγγελίες έχουν ολοκληρωθεί. Καλή δουλειά!"
              />
            ) : (
              <View className="gap-3">
                {upcoming.map((order) => (
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
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(supplier-tabs)/orders")}
            className="rounded-full border border-border bg-surface px-4 py-4"
          >
            <Text className="text-center text-base font-semibold text-foreground">
              Όλες οι παραγγελίες
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

