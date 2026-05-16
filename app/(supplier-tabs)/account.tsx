import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";

const TITLE = "\u039b\u03bf\u03b3\u03b1\u03c1\u03b9\u03b1\u03c3\u03bc\u03cc\u03c2";
const SUB = "\u03a0\u03c1\u03bf\u03c6\u03af\u03bb \u03c0\u03c1\u03bf\u03bc\u03b7\u03b8\u03b5\u03c5\u03c4\u03ae \u03ba\u03b1\u03b9 \u03ad\u03be\u03bf\u03b4\u03bf\u03c2 \u03b1\u03c0\u03cc \u03c4\u03b7\u03bd \u03b5\u03c6\u03b1\u03c1\u03bc\u03bf\u03b3\u03ae.";
const LABEL_NAME = "\u0395\u03c0\u03c9\u03bd\u03c5\u03bc\u03af\u03b1";
const LABEL_EMAIL = "Email";
const LABEL_ROLE = "\u03a1\u03cc\u03bb\u03bf\u03c2";
const ROLE_SUPPLIER = "\u03a0\u03c1\u03bf\u03bc\u03b7\u03b8\u03b5\u03c5\u03c4\u03ae\u03c2";
const BTN_OUT = "\u0388\u03be\u03bf\u03b4\u03bf\u03c2";
const BTN_OUT_PENDING = "\u0388\u03be\u03bf\u03b4\u03bf\u03c2\u2026";
const BTN_EDIT_PROFILE = "\u0395\u03c0\u03b5\u03be\u03b5\u03c1\u03b3\u03b1\u03c3\u03af\u03b1 \u03c0\u03c1\u03bf\u03c6\u03af\u03bb \u03ba\u03b1\u03c4\u03b1\u03c3\u03c4\u03ae\u03bc\u03b1\u03c4\u03bf\u03c2";

export default function SupplierAccountScreen() {
  const router = useRouter();
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

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-8 text-foreground">{TITLE}</Text>
            <Text className="text-base leading-6 text-muted">{SUB}</Text>
          </View>

          <View className="rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">{LABEL_NAME}</Text>
            <Text className="mt-1 text-lg font-bold text-foreground">{user?.name ?? "—"}</Text>
            <Text className="mt-4 text-sm font-semibold text-muted">{LABEL_EMAIL}</Text>
            <Text className="mt-1 text-base text-foreground">{user?.email ?? "—"}</Text>
            <Text className="mt-4 text-sm font-semibold text-muted">{LABEL_ROLE}</Text>
            <Text className="mt-1 text-base text-foreground">{ROLE_SUPPLIER}</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/supplier-profile-edit")}
            accessibilityRole="button"
            className="rounded-full bg-primary px-4 py-4"
          >
            <Text className="text-center text-base font-semibold text-background">
              {BTN_EDIT_PROFILE}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signingOut}
            className={
              signingOut ? "rounded-full border border-border bg-surface px-4 py-4 opacity-70" : "rounded-full border border-border bg-surface px-4 py-4"
            }
          >
            <View className="flex-row items-center justify-center gap-2">
              {signingOut ? <ActivityIndicator /> : null}
              <Text className="text-center text-base font-semibold text-foreground">
                {signingOut ? BTN_OUT_PENDING : BTN_OUT}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
