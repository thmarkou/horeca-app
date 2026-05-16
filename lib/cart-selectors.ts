/**
 * Pure cart reducers & selectors — χωρίς εξαρτήσεις από Zustand, AsyncStorage
 * ή React. Επιτρέπει unit testing σε Node env και επαναχρησιμοποίηση από το
 * checkout / order-summary layers χωρίς να γίνεται store subscribe.
 */

export type CartItem = {
  productId: string;
  supplierId: string;
  supplierName: string;
  productName: string;
  unit: string;
  /** Unit price σε EUR. Καθορίζει totals. */
  priceEur: number;
  qty: number;
  /** Unix timestamp για ταξινόμηση «πιο πρόσφατα στην κορυφή». */
  addedAt: number;
};

export type CartItemInput = Omit<CartItem, "qty" | "addedAt">;

export type CartState = {
  items: CartItem[];
};

export type CartSupplierGroup = {
  supplierId: string;
  supplierName: string;
  items: CartItem[];
  /** Άθροισμα `priceEur * qty` για όλα τα items του supplier. */
  subtotalEur: number;
};

// ─── Reducers (pure) ───────────────────────────────────────────────────────

/**
 * Προσθήκη νέου row ή increment υπάρχοντος (matched by productId). Αν `qty`
 * μη θετικό, επιστρέφει το state αμετάβλητο — κανείς δεν θέλει 0-qty rows.
 */
export function applyAddItem(state: CartState, input: CartItemInput, qty: number, now: number): CartState {
  if (qty <= 0) return state;
  const existing = state.items.find((i) => i.productId === input.productId);
  if (existing) {
    return {
      items: state.items.map((i) =>
        i.productId === input.productId ? { ...i, qty: i.qty + qty } : i,
      ),
    };
  }
  return { items: [{ ...input, qty, addedAt: now }, ...state.items] };
}

/** Άμεση αλλαγή ποσότητας. qty<=0 αφαιρεί το item (auto-remove on min). */
export function applySetItemQty(state: CartState, productId: string, qty: number): CartState {
  if (qty <= 0) return { items: state.items.filter((i) => i.productId !== productId) };
  return { items: state.items.map((i) => (i.productId === productId ? { ...i, qty } : i)) };
}

/** Πλήρης αφαίρεση item. */
export function applyRemoveItem(state: CartState, productId: string): CartState {
  return { items: state.items.filter((i) => i.productId !== productId) };
}

/** Αφαίρεση όλων των items ενός supplier. */
export function applyClearBySupplier(state: CartState, supplierId: string): CartState {
  return { items: state.items.filter((i) => i.supplierId !== supplierId) };
}

// ─── Selectors (pure) ──────────────────────────────────────────────────────

/** Σύνολο μοναδικών rows (όχι quantities). */
export function selectItemCount(state: CartState): number {
  return state.items.length;
}

/** Άθροισμα όλων των ποσοτήτων (πχ για badge στο tab icon). */
export function selectTotalQty(state: CartState): number {
  return state.items.reduce((acc, i) => acc + i.qty, 0);
}

/** Συνολικό κόστος cart σε EUR. */
export function selectTotalEur(state: CartState): number {
  return state.items.reduce((acc, i) => acc + i.priceEur * i.qty, 0);
}

/**
 * Ομαδοποίηση ανά supplier — κάθε ομάδα κρατά τα δικά της items + subtotal.
 * Χρησιμοποιείται στο cart screen και θα είναι η βάση για one-order-per-supplier
 * στο επόμενο βήμα (POST /api/orders).
 */
export function selectGroupedBySupplier(state: CartState): CartSupplierGroup[] {
  const map = new Map<string, CartSupplierGroup>();
  for (const item of state.items) {
    const existing = map.get(item.supplierId);
    if (existing) {
      existing.items.push(item);
      existing.subtotalEur += item.priceEur * item.qty;
    } else {
      map.set(item.supplierId, {
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        items: [item],
        subtotalEur: item.priceEur * item.qty,
      });
    }
  }
  return Array.from(map.values());
}
