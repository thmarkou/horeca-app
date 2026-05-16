/** Greek EUR for list UIs (matches app mock style). */
export function formatEur(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n);
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  new: "\u039d\u03ad\u03b1",
  processing: "\u03a3\u03b5 \u03b5\u03c0\u03b5\u03be\u03b5\u03c1\u03b3\u03b1\u03c3\u03af\u03b1",
  in_transit: "\u039a\u03b1\u03b8' \u03bf\u03b4\u03cc\u03bd",
  completed: "\u039f\u03bb\u03bf\u03ba\u03bb\u03b7\u03c1\u03ce\u03b8\u03b7\u03ba\u03b5",
  // Terminal state — μπορεί να φτάσει εκεί είτε από supplier reject (Φάση 0.5)
  // είτε από buyer cancel (μελλοντική φάση). Διατηρούμε ένα label για όλα.
  cancelled: "\u0391\u03ba\u03c5\u03c1\u03ce\u03b8\u03b7\u03ba\u03b5",
};

export function formatOrderStatus(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

const AVAIL_IMMEDIATE =
  "\u0386\u03bc\u03b5\u03c3\u03b1 \u03b4\u03b9\u03b1\u03b8\u03ad\u03c3\u03b9\u03bc\u03bf";
const AVAIL_LIMITED = "\u03a0\u03b5\u03c1\u03b9\u03bf\u03c1\u03b9\u03c3\u03bc\u03ad\u03bd\u03bf";

export function formatAvailability(
  availability: string,
): typeof AVAIL_IMMEDIATE | typeof AVAIL_LIMITED {
  return availability === "immediate" ? AVAIL_IMMEDIATE : AVAIL_LIMITED;
}

export function parsePriceToNumber(priceDisplay: string): string {
  const cleaned = priceDisplay.replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  if (Number.isNaN(n)) return "0";
  return n.toFixed(2);
}
