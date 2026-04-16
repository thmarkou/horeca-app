import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  isDevEnvironment,
  PLAN_CATALOG,
  PRO_PRICE_MONTHLY_EUR,
  PRO_PRICE_YEARLY_EUR,
  PRO_PRICE_YEARLY_MONTHLY_EUR,
  useActivateProMutation,
  useCancelSubscriptionMutation,
  useSubscriptionQuery,
  type PlanDescriptor,
  type Subscription,
} from "@/lib/subscription";

type BillingCycle = "monthly" | "yearly";

/**
 * Greek date formatter για το «Ανανέωση: Δ Μ» chip. Κρατάει formatting σε ένα
 * σημείο — αν αλλάξει locale policy, αλλάζουμε μόνο εδώ.
 */
function formatGreekDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(sub: Subscription): string {
  if (sub.status === "trialing") return "Δοκιμαστική περίοδος";
  if (sub.status === "canceled") return "Έληξε η αυτόματη ανανέωση";
  if (sub.status === "expired") return "Έληξε";
  return sub.isPro ? "Ενεργή συνδρομή" : "Δωρεάν πλάνο";
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const colors = useColors();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const { data: subscription, isLoading, refetch } = useSubscriptionQuery();
  const activateMutation = useActivateProMutation();
  const cancelMutation = useCancelSubscriptionMutation();

  const isPro = subscription?.isPro ?? false;
  const renewsAtLabel = formatGreekDate(subscription?.renewsAt ?? null);

  const handleUpgrade = () => {
    const months = billingCycle === "yearly" ? 12 : 1;
    activateMutation.mutate(
      { months },
      {
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Δεν ολοκληρώθηκε η αναβάθμιση.";
          Alert.alert("Κάτι πήγε στραβά", message);
        },
      },
    );
  };

  const cancelWithErrorHandling = (immediate: boolean) =>
    cancelMutation.mutate(
      { immediate },
      {
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Δεν ολοκληρώθηκε η ακύρωση.";
          Alert.alert("Κάτι πήγε στραβά", message);
        },
      },
    );

  const handleCancel = () => {
    Alert.alert(
      "Ακύρωση συνδρομής",
      subscription?.renewsAt
        ? `Θα παραμείνεις στο Pro μέχρι ${renewsAtLabel ?? "τη λήξη του κύκλου"}, χωρίς αυτόματη ανανέωση. Θέλεις να συνεχίσεις;`
        : "Θα επιστρέψεις στο Δωρεάν πλάνο άμεσα. Θέλεις να συνεχίσεις;",
      [
        { text: "Άκυρο", style: "cancel" },
        {
          text: "Ακύρωση συνδρομής",
          style: "destructive",
          onPress: () => cancelWithErrorHandling(false),
        },
      ],
    );
  };

  // Dev-only: παρακάμπτει τη λογική «μείνε Pro μέχρι το renewsAt» ώστε να
  // μπορείς να δοκιμάζεις γρήγορα κλειδωμένα features. Θα απομακρυνθεί
  // αυτόματα όταν το app φτιαχτεί για App Store (το __DEV__ γίνεται false).
  const handleDowngradeNow = () => {
    Alert.alert(
      "Άμεση επιστροφή σε Δωρεάν",
      "Demo shortcut: παρακάμπτει τον κανονικό κύκλο και πέφτει κατευθείαν σε Free. Δεν θα υπάρχει στο App Store.",
      [
        { text: "Άκυρο", style: "cancel" },
        {
          text: "Επιστροφή σε Δωρεάν",
          style: "destructive",
          onPress: () => cancelWithErrorHandling(true),
        },
      ],
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      >
        <View className="gap-6 pt-2">
          <TouchableOpacity onPress={() => router.back()} className="self-start">
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Συνδρομή</Text>
            <Text className="text-base leading-6 text-muted">
              Διάλεξε το πλάνο που ταιριάζει στο κατάστημά σου. Μπορείς πάντα να αναβαθμίσεις ή να
              ακυρώσεις.
            </Text>
          </View>

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              {subscription ? (
                <CurrentPlanCard
                  subscription={subscription}
                  renewsAtLabel={renewsAtLabel}
                  onRefetch={() => refetch()}
                />
              ) : null}

              {!isPro ? (
                <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
              ) : null}

              <View className="gap-3">
                {PLAN_CATALOG.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrent={plan.id === (subscription?.plan ?? "free")}
                    billingCycle={billingCycle}
                  />
                ))}
              </View>

              {isPro ? (
                <View className="gap-2">
                  <TouchableOpacity
                    onPress={handleCancel}
                    disabled={cancelMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Ακύρωση συνδρομής Pro"
                    className={
                      cancelMutation.isPending
                        ? "flex-row items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-4 opacity-60"
                        : "flex-row items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-4"
                    }
                  >
                    {cancelMutation.isPending ? (
                      <ActivityIndicator color={colors.foreground} />
                    ) : null}
                    <Text className="text-base font-semibold text-foreground">Ακύρωση συνδρομής</Text>
                  </TouchableOpacity>
                  {isDevEnvironment() ? (
                    <TouchableOpacity
                      onPress={handleDowngradeNow}
                      disabled={cancelMutation.isPending}
                      accessibilityRole="button"
                      accessibilityLabel="Dev-only: άμεση επιστροφή σε Δωρεάν"
                      className="flex-row items-center justify-center gap-2 rounded-full border border-dashed border-warning bg-surface px-4 py-3"
                    >
                      <IconSymbol name="arrow.clockwise" size={14} color={colors.warning} />
                      <Text className="text-sm font-semibold text-warning">
                        Dev: επιστροφή σε Δωρεάν άμεσα
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleUpgrade}
                  disabled={activateMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Αναβάθμιση σε Pro (${billingCycle === "yearly" ? "ετήσιο" : "μηνιαίο"})`}
                  className={
                    activateMutation.isPending
                      ? "flex-row items-center justify-center gap-2 rounded-full bg-primary/60 px-4 py-4"
                      : "flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 py-4"
                  }
                >
                  {activateMutation.isPending ? (
                    <ActivityIndicator color={colors.background} />
                  ) : null}
                  <Text className="text-base font-semibold text-background">
                    {billingCycle === "yearly"
                      ? `Αναβάθμιση — €${PRO_PRICE_YEARLY_EUR} / έτος`
                      : `Αναβάθμιση — €${PRO_PRICE_MONTHLY_EUR} / μήνα`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Legal fine print — disclosure για mock/demo flow. Θα αντικατασταθεί
                  με Apple EULA / ToS links όταν μπει το πραγματικό billing. */}
              <Text className="text-center text-xs leading-5 text-muted">
                Στην demo έκδοση η αναβάθμιση είναι προσομοίωση. Στην κανονική έκδοση η χρέωση θα
                γίνεται μέσω Apple ID και μπορείς να ακυρώσεις οποιαδήποτε στιγμή.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function CurrentPlanCard({
  subscription,
  renewsAtLabel,
  onRefetch,
}: {
  subscription: Subscription;
  renewsAtLabel: string | null;
  onRefetch: () => void;
}) {
  const colors = useColors();
  const badgeClasses = subscription.isPro
    ? "rounded-full bg-success/10 px-3 py-1"
    : "rounded-full bg-primary/10 px-3 py-1";
  const badgeTextClasses = subscription.isPro
    ? "text-xs font-semibold text-success"
    : "text-xs font-semibold text-primary";

  return (
    <View className="gap-3 rounded-[24px] border border-border bg-surface p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-xs font-semibold uppercase text-muted">Τρέχον πλάνο</Text>
          <Text className="text-lg font-bold text-foreground">
            {subscription.plan === "pro" ? "Pro" : "Δωρεάν"}
          </Text>
          <Text className="text-sm text-muted">{statusLabel(subscription)}</Text>
        </View>
        <View className={badgeClasses}>
          <Text className={badgeTextClasses}>
            {subscription.isPro ? "Ενεργή" : "Δωρεάν"}
          </Text>
        </View>
      </View>

      {subscription.isPro && renewsAtLabel ? (
        <View className="flex-row items-center gap-2">
          <IconSymbol name="clock.fill" size={14} color={colors.muted} />
          <Text className="text-sm text-muted">
            {subscription.status === "canceled"
              ? `Λήγει στις ${renewsAtLabel}`
              : `Επόμενη ανανέωση: ${renewsAtLabel}`}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={onRefetch}
        accessibilityRole="button"
        accessibilityLabel="Ανανέωση στοιχείων συνδρομής"
        className="self-start"
      >
        <Text className="text-xs font-semibold text-primary">Ανανέωση κατάστασης</Text>
      </TouchableOpacity>
    </View>
  );
}

function BillingCycleToggle({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (next: BillingCycle) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">Κύκλος χρέωσης</Text>
      <View className="flex-row gap-2">
        <CycleOption
          label="Μηνιαίο"
          sublabel={`€${PRO_PRICE_MONTHLY_EUR}/μήνα`}
          selected={value === "monthly"}
          onPress={() => onChange("monthly")}
        />
        <CycleOption
          label="Ετήσιο"
          sublabel={`€${PRO_PRICE_YEARLY_MONTHLY_EUR}/μήνα · -25%`}
          selected={value === "yearly"}
          onPress={() => onChange("yearly")}
        />
      </View>
    </View>
  );
}

function CycleOption({
  label,
  sublabel,
  selected,
  onPress,
}: {
  label: string;
  sublabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={
        selected
          ? "flex-1 gap-1 rounded-[20px] border border-primary bg-primary/5 px-4 py-3"
          : "flex-1 gap-1 rounded-[20px] border border-border bg-surface px-4 py-3"
      }
    >
      <Text
        className={
          selected ? "text-sm font-semibold text-primary" : "text-sm font-semibold text-foreground"
        }
      >
        {label}
      </Text>
      <Text className="text-xs text-muted">{sublabel}</Text>
    </TouchableOpacity>
  );
}

function PlanCard({
  plan,
  isCurrent,
  billingCycle,
}: {
  plan: PlanDescriptor;
  isCurrent: boolean;
  billingCycle: BillingCycle;
}) {
  const colors = useColors();
  const isPro = plan.id === "pro";

  // Για το Pro, το price label στην κάρτα αντανακλά τον επιλεγμένο cycle
  // (monthly / yearly). Το Δωρεάν παραμένει σταθερό.
  const displayPriceLabel = !isPro
    ? plan.priceLabel
    : billingCycle === "yearly"
      ? `€${PRO_PRICE_YEARLY_EUR} / έτος (€${PRO_PRICE_YEARLY_MONTHLY_EUR}/μήνα)`
      : `€${PRO_PRICE_MONTHLY_EUR} / μήνα`;

  return (
    <View
      className={
        isPro
          ? "gap-3 rounded-[24px] border-2 border-primary bg-surface p-5"
          : "gap-3 rounded-[24px] border border-border bg-surface p-5"
      }
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-foreground">{plan.name}</Text>
            {isCurrent ? (
              <View className="rounded-full bg-success/10 px-2 py-1">
                <Text className="text-[11px] font-semibold text-success">Τρέχον</Text>
              </View>
            ) : isPro ? (
              <View className="rounded-full bg-primary/10 px-2 py-1">
                <Text className="text-[11px] font-semibold text-primary">Προτεινόμενο</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-sm text-muted">{plan.tagline}</Text>
        </View>
      </View>

      <Text className="text-base font-semibold text-foreground">{displayPriceLabel}</Text>

      <View className="gap-2">
        {plan.bullets.map((bullet) => (
          <View key={bullet} className="flex-row items-start gap-2">
            <IconSymbol
              name="checkmark.circle.fill"
              size={16}
              color={isPro ? colors.primary : colors.success}
            />
            <Text className="flex-1 text-sm leading-5 text-foreground">{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
