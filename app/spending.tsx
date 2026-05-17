import { useRouter } from "expo-router";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type DimensionValue,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { GatedAction } from "@/components/ui/gated-action";
import { SimpleSpendingLineChart } from "@/components/ui/simple-spending-line-chart";
import { useColors } from "@/hooks/use-colors";
import * as Auth from "@/lib/_core/auth";
import { formatEur } from "@/lib/format";
import {
  type BuyerSpendingPayload,
  type SpendingMonthsParam,
  useBuyerSpendingQuery,
} from "@/lib/horeca-queries";
import { exportAndShareUtf8Csv } from "@/lib/share-utf8-csv";
import { useFeatures } from "@/lib/subscription";

const RANGE_CHOICES: ReadonlyArray<{ key: SpendingMonthsParam; label: string }> = [
  { key: 3, label: "3μ" },
  { key: 6, label: "6μ" },
  { key: 12, label: "12μ" },
];

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildSpendingCsv(s: BuyerSpendingPayload): string {
  const lines: string[] = [];
  lines.push([csvEscape("Παράθυρο"), csvEscape(s.appliedWindowLabel)].join(","));
  lines.push(
    [csvEscape("Σύνολο (EUR)"), Number.isFinite(s.grandTotalEur) ? s.grandTotalEur.toFixed(2) : ""].join(","),
  );
  const fromIso = new Date(s.rangeFromMs).toISOString();
  const toIso = new Date(s.rangeToMs).toISOString();
  lines.push([csvEscape("Από UTC"), csvEscape(fromIso)].join(","));
  lines.push([csvEscape("Έως UTC"), csvEscape(toIso)].join(","));

  lines.push("");
  lines.push([csvEscape("Μήνας"), csvEscape("Ποσό (EUR)")].join(","));
  for (const row of s.months) {
    lines.push([csvEscape(row.label), csvEscape(String(row.totalEur.toFixed(2)))].join(","));
  }

  lines.push("");
  lines.push([csvEscape("Κατηγορία"), csvEscape("Ποσό (EUR)")].join(","));
  for (const row of s.byCategory) {
    lines.push([csvEscape(row.category), csvEscape(String(row.totalEur.toFixed(2)))].join(","));
  }

  lines.push("");
  lines.push([csvEscape("Προμηθευτής"), csvEscape("Ποσό (EUR)")].join(","));
  for (const row of s.topSuppliers) {
    lines.push([csvEscape(row.supplierName), csvEscape(String(row.totalEur.toFixed(2)))].join(","));
  }

  return lines.join("\n");
}

function HorizontalBar(props: {
  fraction: number;
  trackColor: string;
  fillColor: string;
}): ReactElement {
  const w = `${Math.round(Math.min(1, Math.max(0, props.fraction)) * 100)}%` as DimensionValue;
  return (
    <View className="mt-2 h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: props.trackColor }}>
      <View className="h-full rounded-full" style={{ backgroundColor: props.fillColor, width: w }} />
    </View>
  );
}

export default function SpendingScreen() {
  const router = useRouter();
  const colors = useColors();
  const features = useFeatures();

  /** `null`: ακόμη φορτώνει το προφίλ· `false`: λογαριασμός που δεν είναι buyer· `true`: επιτρεπόμενο. */
  const [buyerEligible, setBuyerEligible] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    Auth.getUserInfo().then((u) => {
      if (cancelled) return;
      if (!u) {
        setBuyerEligible(false);
        return;
      }
      setBuyerEligible(u.role === "buyer");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestMonthsDefault: SpendingMonthsParam = 6;
  const [months, setMonths] = useState<SpendingMonthsParam>(requestMonthsDefault);
  const effectiveMonths =
    features.canCompareCosts ? months : requestMonthsDefault;

  const { data, isPending, isError, refetch, isRefetching } = useBuyerSpendingQuery({
    months: effectiveMonths,
    enabled: buyerEligible === true,
  });

  const monthMax = useMemo(
    () => (data?.months.length ? Math.max(...data.months.map((m) => m.totalEur), 1e-9) : 1),
    [data],
  );
  const catMax = useMemo(
    () =>
      data?.byCategory.length ? Math.max(...data.byCategory.map((m) => m.totalEur), 1e-9) : 1,
    [data],
  );
  const supMax = useMemo(
    () =>
      data?.topSuppliers.length ? Math.max(...data.topSuppliers.map((m) => m.totalEur), 1e-9) : 1,
    [data],
  );

  const handleExportCsv = useCallback(async () => {
    if (!data) {
      Alert.alert("Δεν υπάρχουν δεδομένα", "Ανανέωσε την οθόνη και δοκίμασε ξανά.");
      return;
    }
    try {
      await exportAndShareUtf8Csv({
        body: buildSpendingCsv(data),
        fileNameStem: `horeca-dapanes-${effectiveMonths}m`,
      });
    } catch {
      Alert.alert(
        "Δεν ολοκληρώθηκε η εξαγωγή",
        "Έλεγξε αν χρειάζονται δικαιώματα αποθηκευτικού χώρου και δοκίμασε ξανά. Αν το πρόβλημα συνεχίζεται, επικοινώνησε με την υποστήριξη.",
      );
    }
  }, [data, effectiveMonths]);

  if (buyerEligible === null) {
    return (
      <ScreenContainer className="px-5" containerClassName="bg-background">
        <ActivityIndicator color={colors.muted} className="mt-12 self-center" />
      </ScreenContainer>
    );
  }

  if (!buyerEligible) {
    return (
      <ScreenContainer className="px-5" containerClassName="bg-background">
        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} className="pt-3 pb-2">
          <Text className="text-sm font-semibold text-primary">Πίσω</Text>
        </TouchableOpacity>
        <View className="mt-10 rounded-[24px] border border-border bg-surface p-5">
          <Text className="text-base leading-7 text-muted">
            Η ανάλυση δαπανών διατίθεται μόνο για λογαριασμούς καταστήματος και απαιτεί σύνδεση ως χρήστης Αγοράς.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push("/welcome")}
            className="mt-5 self-start rounded-full bg-primary px-4 py-2"
          >
            <Text className="text-sm font-semibold text-background">Στην οθόνη εισόδου</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5" containerClassName="bg-background">
      <ScrollView
        /** `flexGrow` στον container συχνά δίνει λάθος αρχικό offset σε iOS (φαίνεται «άδειος» μέχρι scroll). */
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        needsOffscreenAlphaCompositing
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior={Platform.OS === "ios" ? "automatic" : undefined}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
      >
        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} className="pt-3 pb-2">
          <Text className="text-sm font-semibold text-primary">Πίσω</Text>
        </TouchableOpacity>

        <Text className="text-[26px] font-bold text-foreground">Έξοδα ανά προμηθευτή</Text>
        <Text className="mt-2 text-base leading-6 text-muted">
          Σύνολο αγορών, κατά μήνα, κατά κατηγορία και οι μεγαλύτεροι προμηθευτές στο επιλεγμένο χρονικό παράθυρο· το
          server εφαρμόζει τα όρια Δωρεάν / Pro αυτόματα.
        </Text>

        {features.canCompareCosts ? (
          <View className="mt-4 flex-row gap-2">
            {RANGE_CHOICES.map((opt) => {
              const active = months === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMonths(opt.key)}
                  className={`rounded-full border px-4 py-2 ${
                    active ? "border-primary bg-primary/10" : "border-border bg-surface"
                  }`}
                >
                  <Text className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View className="mt-4 rounded-[20px] border border-border bg-surface p-4">
            <Text className="text-xs font-semibold uppercase text-muted">Δωρεάν πλάνο</Text>
            <Text className="mt-1 text-sm leading-5 text-foreground">
              Βλέπεις κυλιόμενες {features.historyWindowDays} ημέρες. Με το Pro δέχεσαι αναφορές 3, 6 και 12 μηνών.
            </Text>
          </View>
        )}

        <View className="mt-6 gap-4">
          {isPending ? (
            <ActivityIndicator color={colors.muted} />
          ) : isError ? (
            <View className="rounded-[24px] border border-border bg-surface p-5">
              <Text className="text-base text-muted">
                Δεν ήταν δυνατή η φόρτωση των δεδομένων πληρωμών. Αν συνδεθείς ως προμηθευτής, η οθόνη δεν διατίθεται·
                άλλιως δοκίμασε και πάλι.
              </Text>
            </View>
          ) : data ? (
            <>
              <View className="rounded-[28px] border border-border bg-surface p-5">
                <Text className="text-xs font-semibold uppercase text-muted">{data.appliedWindowLabel}</Text>
                <Text className="mt-3 text-[32px] font-bold leading-9 text-foreground">
                  {formatEur(data.grandTotalEur)}
                </Text>
                <Text className="mt-2 text-xs leading-5 text-muted">
                  Τα υποκατηγορικά ποσά βασίζονται στις τρέχουσες τιμές/κατηγορίες καταλόγου (όχι snapshot γραμμής).
                </Text>
              </View>

              <GatedAction
                feature="canExportHistory"
                label="Εξαγωγή CSV"
                variant="outline"
                iconName="arrow.right"
                paywallTitle="Εξαγωγή με Pro"
                paywallMessage="Η εξαγωγή CSV για λογιστική είναι διαθέσιμη με το Pro όπως και το πλήρες ιστορικό."
                onUnlockedPress={() => void handleExportCsv()}
              />

              <View className="gap-3 rounded-[28px] border border-border bg-surface p-5">
                <View className="gap-1">
                  <Text className="text-base font-bold text-foreground">Ανά μήνα</Text>
                  {data.months.length > 0 ? (
                    <Text className="text-xs text-muted">Τάση ποσών (γραμμή) και σύνοψη ανά ημερολογιακό μήνα UTC.</Text>
                  ) : null}
                </View>
                {data.months.length === 0 ? (
                  <Text className="text-sm text-muted">Δεν υπάρχουν παραγγελίες σε αυτό το παράθυρο.</Text>
                ) : (
                  <SimpleSpendingLineChart
                    series={data.months.map((m) => ({ label: m.label, value: m.totalEur }))}
                    strokeColor={colors.primary}
                    fillColorMask={`${colors.primary}44`}
                    gridColor={colors.border}
                  />
                )}
                {data.months.length > 0 ? (
                  data.months.map((m) => (
                    <View key={m.monthKey}>
                      <View className="flex-row justify-between gap-3">
                        <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
                          {m.label}
                        </Text>
                        <Text className="text-sm font-semibold text-foreground">{formatEur(m.totalEur)}</Text>
                      </View>
                      <HorizontalBar fraction={monthMax > 0 ? m.totalEur / monthMax : 0} trackColor={`${colors.muted}22`} fillColor={colors.primary} />
                    </View>
                  ))
                ) : null}
              </View>

              <View className="gap-3 rounded-[28px] border border-border bg-surface p-5">
                <Text className="text-base font-bold text-foreground">Κατηγορίες</Text>
                {data.byCategory.length === 0 ? (
                  <Text className="text-sm text-muted">Δεν υπάρχουν γραμμές παραγγελιών στο παράθυρο.</Text>
                ) : (
                  data.byCategory.map((c) => (
                    <View key={c.category}>
                      <View className="flex-row justify-between gap-3">
                        <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={2}>
                          {c.category}
                        </Text>
                        <Text className="text-sm font-semibold text-foreground">{formatEur(c.totalEur)}</Text>
                      </View>
                      <HorizontalBar fraction={catMax > 0 ? c.totalEur / catMax : 0} trackColor={`${colors.warning}22`} fillColor={colors.warning} />
                    </View>
                  ))
                )}
              </View>

              <View className="gap-3 rounded-[28px] border border-border bg-surface p-5">
                <Text className="text-base font-bold text-foreground">Κορυφαίοι προμηθευτές</Text>
                {data.topSuppliers.length === 0 ? (
                  <Text className="text-sm text-muted">Κενό.</Text>
                ) : (
                  data.topSuppliers.map((row) => (
                    <View key={row.supplierId}>
                      <View className="flex-row justify-between gap-3">
                        <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={2}>
                          {row.supplierName}
                        </Text>
                        <Text className="text-sm font-semibold text-foreground">{formatEur(row.totalEur)}</Text>
                      </View>
                      <HorizontalBar fraction={supMax > 0 ? row.totalEur / supMax : 0} trackColor={`${colors.primary}18`} fillColor={`${colors.primary}cc`} />
                    </View>
                  ))
                )}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
