import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { subscriptions } from "../db/schema";

/** Ίδια λογική με `mapSubscriptionRow` στο `app.ts` για το isPro bit. */
export function subscriptionRowIsPro(plan: string, status: string): boolean {
  return plan === "pro" && (status === "active" || status === "trialing" || status === "canceled");
}

export async function isUserPro(userId: number): Promise<boolean> {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (!row) return false;
  return subscriptionRowIsPro(row.plan, row.status);
}
