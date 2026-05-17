import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { CartSummaryBar } from "@/components/ui/cart-summary-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { StatusPill } from "@/components/ui/status-pill";
import { useColors } from "@/hooks/use-colors";
import { useBuyerActiveLocationPicker } from "@/hooks/use-buyer-active-location";
import * as Auth from "@/lib/_core/auth";
import { getFirstName } from "@/lib/greeting";
import { partitionOrdersByHistoryWindow } from "@/lib/order-history-window";
import {
  useFeaturedProductsQuery,
  useRecentOrdersQuery,
  useSupplierCategoriesQuery,
  useSuppliersListQuery,
} from "@/lib/horeca-queries";
import { useFeatures } from "@/lib/subscription";

type QuickAction = {
  key: string;
  label: string;
  icon: Parameters<typeof IconSymbol>[0]["name"];
  href: Parameters<ReturnType<typeof useRouter>["push"]>[0];
};

const QUICK_ACTIONS: QuickAction[] = [
  { key: "search", label: "Αναζήτηση", icon: "magnifyingglass", href: "/suppliers" },
  { key: "suppliers", label: "Προμηθευτές", icon: "building.2.fill", href: "/suppliers" },
  { key: "orders", label: "Παραγγελίες", icon: "bag.fill", href: "/(tabs)/orders" },
  { key: "spending", label: "Έξοδα", icon: "chart.bar.fill", href: "/spending" },
  { key: "favorites", label: "Αγαπημένα", icon: "heart.fill", href: "/(tabs)/favorites" },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const features = useFeatures();

  const { activeLocationId, showPicker, locations, setActiveLocationId } = useBuyerActiveLocationPicker();

  // SecureStore read is fast; keep it as local state to match the rest of the
  // app (see `app/(tabs)/_layout.tsx`) instead of introducing a new react-query
  // hook just for this single value.
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

  const { data: supplierCategories = [] } = useSupplierCategoriesQuery();
  const { data: suppliers = [] } = useSuppliersListQuery({});
  const { data: featuredProducts = [] } = useFeaturedProductsQuery({ limit: 10 });

  /** Ίδιο ρίσκο/όφελος με το Orders tab: μεγαλύτερο fetch όταν το free cutoff κόβει τις σειρές ώστε η λίστα να γεμίζει. */
  const ordersListFetchLimit =
    features.historyWindowDays === Number.POSITIVE_INFINITY ? 20 : 100;
  const { data: ordersFeedForHome = [], isLoading: ordersFeedLoading } = useRecentOrdersQuery({
    limit: ordersListFetchLimit,
    locationId: activeLocationId,
  });

  const { visibleOrders: visibleOrdersInWindow } = useMemo(
    () => partitionOrdersByHistoryWindow(ordersFeedForHome, features.historyWindowDays),
    [ordersFeedForHome, features.historyWindowDays],
  );

  const recentOrdersPreview = useMemo(
    () => visibleOrdersInWindow.slice(0, 10),
    [visibleOrdersInWindow],
  );

  // Σκόπιμα δείχνουμε μόνο το ρόλο («Buyer») αντί για χαιρετισμό + όνομα.
  // Ο `userName` συνεχίζει να φορτώνεται για το avatar initial — αλλιώς θα
  // δείχναμε κενό κύκλο όταν λείπει το όνομα από το profile.
  const firstName = getFirstName(userName);
  const avatarInitial = firstName.charAt(0).toUpperCase();

  // KPI strip computed from the recent orders feed so numbers stay in sync
  // with what the user actually sees below (single source of truth).
  const kpis = useMemo(() => {
    const base = visibleOrdersInWindow;
    const inProgress = base.filter((o) => o.status === "Σε επεξεργασία").length;
    const onTheWay = base.filter((o) => o.status === "Καθ' οδόν").length;
    const pendingReview = base.filter((o) => o.status === "Νέα").length;
    return { inProgress, onTheWay, pendingReview };
  }, [visibleOrdersInWindow]);

  const historyWindowLimited = features.historyWindowDays < Number.POSITIVE_INFINITY;
  const onlyOlderOutsideHistoryWindow =
    !ordersFeedLoading &&
    ordersFeedForHome.length > 0 &&
    visibleOrdersInWindow.length === 0 &&
    historyWindowLimited;

  const hasRecentOrders = recentOrdersPreview.length > 0;

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 pb-6 gap-6">
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-medium text-muted">Buyer</Text>
                <Text className="mt-1 text-[28px] font-bold leading-8 text-foreground">
                  Όλες οι προμήθειές σου σε μία ροή.
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Λογαριασμός"
                onPress={() => router.push("/(tabs)/account")}
                className="h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20"
              >
                <Text className="text-base font-bold text-primary">{avatarInitial}</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-base leading-6 text-muted">
              Βρες προμηθευτές, επανάλαβε παραγγελίες και παρακολούθησε παραδόσεις χωρίς τηλεφωνήματα και χαρτιά.
            </Text>
          </View>

          {showPicker ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-foreground">Ενεργό κατάστημα</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/locations")}>
                  <Text className="text-xs font-semibold text-primary">Διαχείριση</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row flex-wrap gap-2">
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

          <View className="rounded-[28px] bg-primary px-5 py-5">
            <Text className="text-sm font-semibold text-background/80">Γρήγορη επανάληψη</Text>
            <Text className="mt-2 text-2xl font-bold leading-8 text-background">
              Η επόμενη εβδομαδιαία παραγγελία σου είναι σχεδόν έτοιμη.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-background/80">
              Με βάση το πρόσφατο ιστορικό σου, μπορείς να επαναλάβεις βασικά είδη καφέ, αναλωσίμων και πρώτων υλών σε λίγα δευτερόλεπτα.
            </Text>
            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                onPress={() => router.push("/suppliers")}
                className="flex-1 rounded-full bg-background px-4 py-3"
              >
                <Text className="text-center text-sm font-semibold text-primary">Νέα παραγγελία</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/orders")}
                className="flex-1 rounded-full border border-background/30 px-4 py-3"
              >
                <Text className="text-center text-sm font-semibold text-background">
                  Επανάληψη
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Γρήγορες ενέργειες</Text>
            <View className="flex-row flex-wrap -mx-1">
              {QUICK_ACTIONS.map((action) => (
                <View key={action.key} className="w-1/2 px-1 mb-2">
                  <TouchableOpacity
                    onPress={() => router.push(action.href)}
                    className="flex-row items-center gap-3 rounded-[20px] border border-border bg-surface px-4 py-4"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <IconSymbol name={action.icon} size={20} color={colors.primary} />
                    </View>
                    <Text className="flex-1 text-sm font-semibold text-foreground">{action.label}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Επισκόπηση</Text>
            <View className="flex-row gap-3">
              <KpiCard
                label="Σε εξέλιξη"
                value={kpis.inProgress}
                icon="clock.fill"
                tint={colors.warning}
                onPress={() => router.push("/(tabs)/orders")}
              />
              <KpiCard
                label="Καθ' οδόν"
                value={kpis.onTheWay}
                icon="shippingbox.fill"
                tint={colors.primary}
                onPress={() => router.push("/(tabs)/orders")}
              />
              <KpiCard
                label="Προς έλεγχο"
                value={kpis.pendingReview}
                icon="checkmark.circle.fill"
                tint={colors.success}
                onPress={() => router.push("/(tabs)/orders")}
              />
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Κατηγορίες</Text>
              <TouchableOpacity onPress={() => router.push("/suppliers")}>
                <Text className="text-sm font-semibold text-primary">Όλες</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {supplierCategories.map((category) => (
                <View key={category} className="rounded-full border border-border bg-surface px-4 py-2">
                  <Text className="text-sm font-medium text-foreground">{category}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Προτεινόμενοι προμηθευτές</Text>
              <TouchableOpacity onPress={() => router.push("/suppliers")}>
                <Text className="text-sm font-semibold text-primary">Προβολή όλων</Text>
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {suppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  onPress={() => router.push({ pathname: "/supplier-profile", params: { id: supplier.id } })}
                  className="rounded-[24px] border border-border bg-surface p-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-2">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-semibold text-foreground">{supplier.name}</Text>
                        {supplier.verified ? (
                          <View className="rounded-full bg-success/10 px-2 py-1">
                            <Text className="text-xs font-semibold text-success">Verified</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-sm text-muted">
                        {supplier.category} · {supplier.location} · {supplier.rating.toFixed(1)}★
                      </Text>
                      <Text className="text-sm leading-6 text-foreground">{supplier.highlight}</Text>
                      <Text className="text-xs font-medium text-muted">
                        {supplier.deliveryTime} · {supplier.minimumOrder}
                      </Text>
                    </View>
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
                      <IconSymbol name="cart.fill.badge.plus" size={20} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Τα βασικά της εβδομάδας</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
                <Text className="text-sm font-semibold text-primary">Παραγγελίες</Text>
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {featuredProducts.map((product) => (
                <View key={product.id} className="rounded-[24px] border border-border bg-background px-4 py-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1 gap-1">
                      <Text className="text-base font-semibold text-foreground">{product.name}</Text>
                      <Text className="text-sm text-muted">
                        {product.category} · {product.unit}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-foreground">{product.price}</Text>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between gap-3">
                    <View className="rounded-full bg-surface px-3 py-2">
                      <Text className="text-xs font-semibold text-muted">{product.availability}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: "/product-detail", params: { id: product.id } })}
                        className="rounded-full border border-border bg-surface px-4 py-2"
                      >
                        <Text className="text-sm font-semibold text-foreground">Λεπτομέρειες</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => router.push("/cart")}
                        className="rounded-full bg-primary px-4 py-2"
                      >
                        <Text className="text-sm font-semibold text-background">Προσθήκη</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3 pb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Πρόσφατες παραγγελίες</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
                <Text className="text-sm font-semibold text-primary">Ιστορικό</Text>
              </TouchableOpacity>
            </View>
            {hasRecentOrders ? (
              <View className="gap-3">
                {recentOrdersPreview.map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    onPress={() => router.push({ pathname: "/order-detail", params: { id: order.id } })}
                    className="rounded-[24px] border border-border bg-surface p-4"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1 gap-1">
                        <Text className="text-base font-semibold text-foreground">{order.supplierName}</Text>
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
            ) : onlyOlderOutsideHistoryWindow ? (
              <EmptyState
                icon={{ name: "clock.fill", color: colors.primary }}
                title={`Ορατό ιστορικό: τελευταίες ${features.historyWindowDays} ημέρες`}
                body={`Δεν υπάρχουν παραγγελίες εντός του δωρεάν παραθύρου των τελευταίων ${features.historyWindowDays} ημερών. Το υπόλοιπο ιστορικό είναι στο tab «Παραγγελίες».`}
                cta={{ label: "Άνοιγμα Παραγγελιών", onPress: () => router.push("/(tabs)/orders") }}
              />
            ) : (
              <EmptyState
                icon={{ name: "bag.fill", color: colors.primary }}
                title="Δεν έχεις ακόμη παραγγελίες"
                body="Ξεκίνα από τους προτεινόμενους προμηθευτές ή αναζήτησε αυτό που χρειάζεσαι."
                cta={{ label: "Αναζήτηση προμηθευτών", onPress: () => router.push("/suppliers") }}
              />
            )}
          </View>
        </View>
      </ScrollView>
      <CartSummaryBar />
    </ScreenContainer>
  );
}

type KpiCardProps = {
  label: string;
  value: number;
  icon: Parameters<typeof IconSymbol>[0]["name"];
  tint: string;
  onPress: () => void;
};

function KpiCard({ label, value, icon, tint, onPress }: KpiCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 rounded-[20px] border border-border bg-surface px-3 py-4 gap-2"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: `${tint}1A` }}
      >
        <IconSymbol name={icon} size={18} color={tint} />
      </View>
      <Text className="text-[22px] font-bold text-foreground">{value}</Text>
      <Text className="text-xs font-medium text-muted">{label}</Text>
    </TouchableOpacity>
  );
}
