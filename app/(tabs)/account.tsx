import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { getFirstName } from "@/lib/greeting";

export default function AccountScreen() {
  const router = useRouter();
  const colors = useColors();
  const [user, setUser] = useState<Auth.User | null>(null);
  const [signingOut, setSigningOut] = useState(false);

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
              Στοιχεία καταστήματος, ρόλος και έξοδος από την εφαρμογή.
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

          <View className="rounded-[28px] border border-border bg-background p-5 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Συνδρομή</Text>
              <View className="rounded-full bg-primary/10 px-3 py-1">
                <Text className="text-xs font-semibold text-primary">Δωρεάν demo</Text>
              </View>
            </View>
            <Text className="text-sm leading-6 text-muted">
              Αυτή τη στιγμή έχεις πρόσβαση σε όλες τις λειτουργίες καταστήματος. Η διαχείριση
              πληρωμών και αναβαθμίσεων θα ενεργοποιηθεί πριν τη διάθεση στο App Store.
            </Text>
          </View>

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

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-base font-semibold text-foreground">{value}</Text>
    </View>
  );
}
