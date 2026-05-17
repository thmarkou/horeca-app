import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * Όταν ο χρήστης πατάει push price alert, ανοίγει τη λίστα ειδοποιήσεων.
 * - `getLastNotificationResponse` + `clearLastNotificationResponse`: cold start από tap.
 * - `addNotificationResponseReceivedListener`: app ήδη ανοιχτό / background.
 */
export function NotificationResponseRouter() {
  const router = useRouter();
  const coldStartDone = useRef(false);

  useEffect(() => {
    if (coldStartDone.current) return;
    const last = Notifications.getLastNotificationResponse();
    if (
      last &&
      last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
      isPriceAlertData(last.notification.request.content.data)
    ) {
      router.push("/price-alerts");
      Notifications.clearLastNotificationResponse();
    }
    coldStartDone.current = true;
  }, [router]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      if (!isPriceAlertData(response.notification.request.content.data)) return;
      router.push("/price-alerts");
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

function isPriceAlertData(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  return (data as Record<string, unknown>).type === "price_alert";
}
