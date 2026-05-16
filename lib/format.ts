/**
 * Client-side formatters για prices και ποσότητες. Διατηρούμε ξεχωριστό
 * module από το `platform/lib/format.ts` (server) ώστε ο mobile bundle να
 * μην εξαρτάται από platform code, αλλά η λογική παραμένει ίδια (el-GR EUR).
 *
 * Όταν προστεθεί i18n (Φάση 4), αυτές οι function-ες θα δέχονται locale.
 */

const EUR_FORMATTER = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
});

/** Μορφοποίηση ποσού σε ελληνικό EUR (π.χ. 18,90 €). */
export function formatEur(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return EUR_FORMATTER.format(amount);
}

/**
 * Πληθυντικός για το «είδος» / «είδη». Χρησιμοποιείται σε cart badges,
 * checkout summaries και supplier order rows. Κρατάμε το mapping εδώ ώστε
 * να μην επαναλαμβάνεται σε πολλά UI sites.
 */
export function pluralizeItems(count: number): string {
  return count === 1 ? "1 είδος" : `${count} είδη`;
}
