import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { priceAlertHits, userPushTokens } from "../db/schema";
import { isUserPro } from "./buyer-is-pro";
import { sendExpoPush } from "./expo-push";

/**
 * Μετά από καταχώρηση `price_alert_hits`: προσπάθεια push σε όλα τα Expo tokens του user.
 * Αν δεν υπάρχουν tokens ή το Expo αποτυγχάνει, το hit παραμένει χωρίς `pushSentAt`.
 */
export async function sendPushForPriceAlertHit(input: {
  hitId: number;
  userId: number;
  alertId: number;
  productName: string;
  supplierName: string;
  priceAtHit: string;
  threshold: string;
}): Promise<void> {
  if (!(await isUserPro(input.userId))) return;

  const tokens = await db
    .select({ token: userPushTokens.token })
    .from(userPushTokens)
    .where(eq(userPushTokens.userId, input.userId));
  const list = tokens.map((r) => r.token);
  if (list.length === 0) return;

  const title = "Horeca Source · τιμή στο όριο";
  const body = `${input.productName} (${input.supplierName}) — κατάλογος ${input.priceAtHit} €, όριο ${input.threshold} €`;

  const ok = await sendExpoPush(list, title, body, {
    type: "price_alert",
    alertId: String(input.alertId),
    hitId: String(input.hitId),
  });

  if (ok) {
    await db
      .update(priceAlertHits)
      .set({ pushSentAt: new Date() })
      .where(eq(priceAlertHits.id, input.hitId));
  }
}
