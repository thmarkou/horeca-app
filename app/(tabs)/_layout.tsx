import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Auth from "@/lib/_core/auth";
import { registerBuyerExpoPushToken } from "@/lib/push-notifications";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 58 + bottomPadding;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await Auth.getUserInfo();
      if (cancelled) return;
      if (user?.role === "supplier") {
        router.replace("/(supplier-tabs)");
        return;
      }
      if (user?.role === "buyer") {
        try {
          await registerBuyerExpoPushToken();
        } catch {
          /* offline / missing API — όχι crash στο tab boot */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Αρχική",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: "Προμηθευτές",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="building.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Παραγγελίες",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Αγαπημένα",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Λογαριασμός",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.crop.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
