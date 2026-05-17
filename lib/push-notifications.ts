import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiRequest } from "@/lib/api/http";

/**
 * Εμφάνιση προς τα εμπρός όταν η εφαρμογή είναι στο προσκήνιο (Expo best practice).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Ζητά permission, παίρνει Expo push token και το καταχωρεί στον server (buyer session).
 * Σιωπηρά αγνοεί simulator / web — το Device.isDevice είναι false στο iOS Simulator.
 */
export async function registerBuyerExpoPushToken(): Promise<void> {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const next = await Notifications.requestPermissionsAsync();
    finalStatus = next.status;
  }
  if (finalStatus !== "granted") return;

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const expo = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await apiRequest("/api/me/notifications/push-token", {
    method: "POST",
    body: JSON.stringify({
      token: expo.data,
      platform: Platform.OS === "ios" ? "ios" : "android",
    }),
    auth: true,
  });
}

/**
 * Κατά την έξοδο, σβήνει όλα τα Expo push tokens του λογαριασμού στον server (best effort).
 * Πρέπει να καλείται **πριν** αφαιρεθεί το JWT από τη συσκευή.
 */
export async function clearAllPushTokensOnServer(): Promise<void> {
  try {
    await apiRequest("/api/me/notifications/push-tokens", {
      method: "DELETE",
      auth: true,
    });
  } catch {
    /* offline / already signed out */
  }
}
