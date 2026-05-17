/**
 * Αποστολή μέσω Expo Push HTTP API (χωρίς FCM/APNs wiring απευθείας στο repo).
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
export async function sendExpoPush(
  expoPushTokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<boolean> {
  const tokens = [...new Set(expoPushTokens.filter((t) => t.length > 0))];
  if (tokens.length === 0) return false;

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: "default" as const,
    priority: "high" as const,
    data,
  }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const json = (await res.json().catch(() => null)) as {
    data?: Array<{ status?: string; message?: string }>;
  } | null;
  if (!res.ok) {
    console.error("[expo-push] HTTP error", res.status, json);
    return false;
  }
  const batch = json?.data;
  if (!Array.isArray(batch)) return false;
  const anyOk = batch.some((item) => item.status === "ok");
  if (!anyOk) {
    console.error("[expo-push] no successful receipts", batch);
  }
  return anyOk;
}
