import type { Order } from "@/lib/mocks/horeca";

/** 24h · χρησιμοποιείται και από subscription `historyWindowDays`. */
export const ORDER_HISTORY_MS_PER_DAY = 86_400_000;

/** Rolling window από «τώρα» — συμφωνεί με `FeatureSet.historyWindowDays`. */
export function cutoffMsForHistoryWindow(historyWindowDays: number, nowMs: number): number | null {
  if (historyWindowDays === Number.POSITIVE_INFINITY) return null;
  return nowMs - historyWindowDays * ORDER_HISTORY_MS_PER_DAY;
}

/** Αν λείπει timestamp, δεν κρύβουμε την παραγγελία (backwards compat με mocks/παλιά payloads). */
export function isOrderOutsideHistoryWindow(
  createdAtMs: number | undefined,
  cutoffMs: number | null,
): boolean {
  if (cutoffMs === null) return false;
  if (createdAtMs == null || !Number.isFinite(createdAtMs)) return false;
  return createdAtMs < cutoffMs;
}

export function partitionOrdersByHistoryWindow(
  orders: Order[],
  historyWindowDays: number,
  nowMs: number = Date.now(),
): { visibleOrders: Order[]; hiddenOlderCount: number } {
  const cutoff = cutoffMsForHistoryWindow(historyWindowDays, nowMs);
  if (cutoff === null) {
    return { visibleOrders: orders, hiddenOlderCount: 0 };
  }
  const visibleOrders: Order[] = [];
  let hiddenOlderCount = 0;
  for (const o of orders) {
    const t = o.createdAt;
    if (isOrderOutsideHistoryWindow(t, cutoff)) hiddenOlderCount += 1;
    else visibleOrders.push(o);
  }
  return { visibleOrders, hiddenOlderCount };
}
