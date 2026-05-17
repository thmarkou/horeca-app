import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "../db/client";
import { orderItems, orders, products, suppliers } from "../db/schema";

/** Συγχωνεύεται με το `historyWindowDays` του free tier στο client/subscription.ts. */
const FREE_SPENDING_ROLLING_DAYS = 30;

export type SpendingMonthsOption = 3 | 6 | 12;

export type SpendingMonthBucket = {
  monthKey: string;
  /** Π.χ. «Μαΐ 2026» */
  label: string;
  totalEur: number;
};

export type SpendingCategorySlice = {
  category: string;
  totalEur: number;
};

export type SpendingSupplierSlice = {
  supplierId: string;
  supplierName: string;
  totalEur: number;
};

export type BuyerSpendingPayload = {
  grandTotalEur: number;
  rangeFromMs: number;
  rangeToMs: number;
  appliedWindowLabel: string;
  months: SpendingMonthBucket[];
  byCategory: SpendingCategorySlice[];
  topSuppliers: SpendingSupplierSlice[];
};

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Εύρος ανά Μήνα: από την 1η UTC του `(τρέχων μήνας - rangeMonths)`
 * μέχρι τώρα. Για Δωρεάν: τρεχούσα ημερομηνία μείον 30 μέρες.
 */
export function spendingRangeBounds(args: {
  nowMs?: number;
  isPro: boolean;
  /** Ισχύει για Pro· οι free λαμβάνουν ρολάρισμα 30ημερου. */
  rangeMonths?: SpendingMonthsOption;
}): { fromMs: number; toMs: number; appliedLabel: string } {
  const toMs = args.nowMs ?? Date.now();

  if (!args.isPro) {
    const fromMs = toMs - FREE_SPENDING_ROLLING_DAYS * 86_400_000;
    return {
      fromMs,
      toMs,
      appliedLabel: `Τελευταίες ${FREE_SPENDING_ROLLING_DAYS} ημέρες (Δωρεάν)`,
    };
  }

  const d = new Date(toMs);
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const monthsBack = args.rangeMonths ?? 6;

  const fromMs = Date.UTC(y, mo - monthsBack, 1, 0, 0, 0, 0);
  const labelMonths = `${monthsBack} μήνες (Pro)`;
  return { fromMs, toMs, appliedLabel: labelMonths };
}

const monthFmt = new Intl.DateTimeFormat("el-GR", { month: "short", year: "numeric", timeZone: "UTC" });

function monthKeyUtc(ts: number): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Aggregation πάνω σε παραγγελίες + γραμμές — χωρίς νέους πίνακες (Φάση 3.3).
 *
 * Ειδοποίηση: ανά κατηγορία βασίζεται στην **τρέχουσα** `products.category`
 * μέσω `product_id` της γραμμής — όχι snapshot κατά την παραγγελία.
 */
export async function aggregateBuyerSpending(args: {
  buyerId: number;
  isPro: boolean;
  rangeMonths?: SpendingMonthsOption;
  nowMs?: number;
}): Promise<BuyerSpendingPayload> {
  const bounds = spendingRangeBounds({
    nowMs: args.nowMs,
    isPro: args.isPro,
    rangeMonths: args.rangeMonths,
  });

  const orderRows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.buyerId, args.buyerId),
        gte(orders.createdAt, new Date(bounds.fromMs)),
        lte(orders.createdAt, new Date(bounds.toMs)),
      ),
    );

  let grandTotalEur = 0;
  const monthAcc = new Map<string, number>();
  const supplierAcc = new Map<number, number>();

  for (const row of orderRows) {
    const t = row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt);
    const te = Number(row.totalEur);
    if (!Number.isFinite(te)) continue;
    grandTotalEur += te;
    const mk = monthKeyUtc(t);
    monthAcc.set(mk, roundMoney((monthAcc.get(mk) ?? 0) + te));

    supplierAcc.set(row.supplierId, roundMoney((supplierAcc.get(row.supplierId) ?? 0) + te));
  }

  grandTotalEur = roundMoney(grandTotalEur);

  const monthKeys = [...monthAcc.keys()].sort();
  const months: SpendingMonthBucket[] = monthKeys.map((key) => {
    const parts = key.split("-").map(Number);
    const [, m] = parts;
    const ym =
      Number.isFinite(parts[0]) && Number.isFinite(m)
        ? Date.UTC(parts[0]!, m! - 1, 15, 12, 0, 0, 0)
        : bounds.toMs - 86400000;
    return {
      monthKey: key,
      label: monthFmt.format(ym),
      totalEur: monthAcc.get(key) ?? 0,
    };
  });

  let byCategory: SpendingCategorySlice[] = [];
  let topSuppliers: SpendingSupplierSlice[] = [];

  const orderIds = orderRows.map((r) => r.id);
  if (orderIds.length > 0) {
    const lineRows = await db
      .select({
        lt: orderItems.lineTotalEur,
        cat: products.category,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(inArray(orderItems.orderId, orderIds));

    const catAcc = new Map<string, number>();
    for (const { lt, cat } of lineRows) {
      const n = Number(lt);
      if (!Number.isFinite(n)) continue;
      catAcc.set(cat, roundMoney((catAcc.get(cat) ?? 0) + n));
    }
    byCategory = [...catAcc.entries()]
      .map(([category, totalEur]) => ({ category, totalEur }))
      .sort((a, b) => b.totalEur - a.totalEur);

    const supPairs = [...supplierAcc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const ids = supPairs.map(([sid]) => sid);
    let nameMap = new Map<number, string>();
    if (ids.length > 0) {
      const supRows = await db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).where(inArray(suppliers.id, ids));
      nameMap = new Map(supRows.map((s) => [s.id, s.name]));
    }
    topSuppliers = supPairs.map(([supplierId, totalEur]) => ({
      supplierId: String(supplierId),
      supplierName: nameMap.get(supplierId) ?? `Supplier #${supplierId}`,
      totalEur,
    }));
  }

  return {
    grandTotalEur,
    rangeFromMs: bounds.fromMs,
    rangeToMs: bounds.toMs,
    appliedWindowLabel: bounds.appliedLabel,
    months,
    byCategory,
    topSuppliers,
  };
}
