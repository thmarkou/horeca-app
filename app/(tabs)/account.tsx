import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { getFirstName } from "@/lib/greeting";
import { useSubscriptionQuery, type Subscription } from "@/lib/subscription";

export default function AccountScreen() {
  const router = useRouter();
  const colors = useColors();
  const [user, setUser] = useState<Auth.User | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const { data: subscription, isLoading: isLoadingSubscription } = useSubscriptionQuery();

  const load = useCallback(async () => {
    setUser(await Auth.getUserInfo());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await Api.signOut();
      router.replace("/welcome");
    } finally {
      setSigningOut(false);
    }
  };

  const displayName = user?.name?.trim() || "—";
  const avatarInitial = getFirstName(user?.name).charAt(0).toUpperCase();

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-3 gap-5">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">Λογαριασμός</Text>
            <Text className="text-base leading-6 text-muted">
              Στοιχεία καταστήματος, συνδρομή και έξοδος από την εφαρμογή.
            </Text>
          </View>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <View className="flex-row items-center gap-4">
              <View
                className="h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20"
                style={{ borderColor: `${colors.primary}33` }}
              >
                <Text className="text-xl font-bold text-primary">{avatarInitial}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">{displayName}</Text>
                <Text className="mt-1 text-sm text-muted">{user?.email ?? "—"}</Text>
              </View>
            </View>

            <View className="mt-5 gap-3 border-t border-border pt-4">
              <ProfileRow label="Ρόλος" value="Κατάστημα" />
              <ProfileRow label="Μέθοδος σύνδεσης" value={user?.loginMethod ?? "email"} />
            </View>
          </View>

          <SubscriptionCard
            subscription={subscription}
            isLoading={isLoadingSubscription}
            onPress={() => router.push("/subscription")}
          />

          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
            className={`rounded-full border border-border bg-surface px-4 py-4 ${
              signingOut ? "opacity-70" : ""
            }`}
          >
            <View className="flex-row items-center justify-center gap-2">
              {signingOut ? <ActivityIndicator color={colors.foreground} /> : null}
              <Text className="text-center text-base font-semibold text-foreground">
                {signingOut ? "Έξοδος…" : "Έξοδος"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SubscriptionCard({
  subscription,
  isLoading,
  onPress,
}: {
  subscription: Subscription | undefined;
  isLoading: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const isPro = subscription?.isPro ?? false;

  const badgeClasses = isPro
    ? "rounded-full bg-success/10 px-3 py-1"
    : "rounded-full bg-primary/10 px-3 py-1";
  const badgeTextClasses = isPro
    ? "text-xs font-semibold text-success"
    : "text-xs font-semibold text-primary";
  const badgeLabel = isPro ? "Pro" : "Δωρεάν";

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Άνοιγμα οθόνης συνδρομής"
      className="gap-3 rounded-[28px] border border-border bg-background p-5"
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-lg font-bold text-foreground">Συνδρομή</Text>
        <View className={badgeClasses}>
          <Text className={badgeTextClasses}>{badgeLabel}</Text>
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.muted} />
      ) : (
        <Text className="text-sm leading-6 text-muted">
          {isPro
            ? "Έχεις πρόσβαση σε όλα τα premium features. Διαχείριση ή ακύρωση από την οθόνη συνδρομής."
            : "Ξεκλείδωσε πλήρες ιστορικό, export, price alerts και multi-location με το Pro πλάνο."}
        </Text>
      )}
      <View className="flex-row items-center gap-2 self-start">
        <Text className="text-sm font-semibold text-primary">
          {isPro ? "Διαχείριση συνδρομής" : "Δες τα πλάνα"}
        </Text>
        <IconSymbol name="arrow.right" size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-base font-semibold text-foreground">{value}</Text>
    </View>
  );
}
