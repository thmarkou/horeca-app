/**
 * Pure utilities για cart/checkout pricing logic — testable σε Node χωρίς
 * React Native runtime. Όλες οι functions εδώ είναι deterministic, χωρίς
 * side-effects ή external dependencies.
 */

/**
 * Parser για το free-text MOQ field του supplier (π.χ. «Ελάχιστη παραγγελία
 * 80€»). Επιστρέφει το πρώτο numeric ποσό σε EUR ή `null` αν το πεδίο δεν
 * περιέχει αναγνωρίσιμη τιμή («Δεν έχει οριστεί», «Χωρίς ελάχιστο» κ.λπ.).
 *
 * Υποστηριζόμενες μορφές (αυτές που εμφανίζονται στα seed/edit forms):
 * - `80€`, `80 €`, `80,50€`, `80.50 €`
 * - `60 ευρώ`
 * - `€120`, `EUR 80`
 *
 * Σημαντικά:
 * - Δέχεται comma (Ευρωπαϊκό decimal) ή dot — οι suppliers γράφουν με
 *   ποικίλους τρόπους.
 * - Επιστρέφει `null` αντί για `0` ώστε το UI να μπορεί να ξεχωρίσει
 *   «δεν υπάρχει MOQ» από «MOQ €0».
 */
export function parseMinimumOrderEur(text: string): number | null {
  // Δύο orderings: digits-then-currency και currency-then-digits.
  // Δοκιμάζουμε το πιο συνηθισμένο (digits-first) πρώτο.
  const numPart = "(\\d+(?:[.,]\\d{1,2})?)";
  const curPart = "(?:€|ευρώ|EUR)";
  const re = new RegExp(`${numPart}\\s*${curPart}|${curPart}\\s*${numPart}`, "i");
  const match = text.match(re);
  if (!match) return null;
  // group[1] = digits-first capture, group[2] = currency-first capture
  const numStr = match[1] ?? match[2];
  if (!numStr) return null;
  const n = Number(numStr.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
