import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  applyAddItem,
  applyClearBySupplier,
  applyRemoveItem,
  applySetItemQty,
  selectTotalEur,
  selectTotalQty,
  type CartItemInput,
  type CartState,
} from "@/lib/cart-selectors";

/**
 * B2B cart store με persistence στο AsyncStorage. Όλη η state-transition
 * λογική είναι σε pure helpers (`lib/cart-selectors.ts`) ώστε να είναι
 * testable χωρίς να χρειάζεται AsyncStorage mocking.
 *
 * Σχεδιαστικές αποφάσεις:
 * - Τα items είναι keyed by `productId` (ένα cart row ανά μοναδικό προϊόν).
 * - Κάθε item κρατά denormalized snapshot (supplierName, productName, unit,
 *   priceEur) ώστε το cart screen να μην εξαρτάται από network call για
 *   ονόματα. Trade-off: αν αλλάξει η τιμή supplier-side, ο buyer βλέπει την
 *   παλιά μέχρι να ξανα-προσθέσει — accepted για cart UX.
 * - Στο B2B δεν αναμειγνύουμε προϊόντα διαφορετικών suppliers σε ένα order·
 *   το checkout θα δημιουργήσει ένα order ανά supplier (groupBySupplier).
 */

type CartActions = {
  /** Προσθήκη ή increment υπάρχοντος row. */
  addItem: (input: CartItemInput, qty?: number) => void;
  /** Άμεση αλλαγή ποσότητας. qty<=0 αφαιρεί το item. */
  setItemQty: (productId: string, qty: number) => void;
  /** Αφαίρεση item ανεξαρτήτως ποσότητας. */
  removeItem: (productId: string) => void;
  /** Καθαρισμός όλου του cart (πχ μετά από επιτυχημένο order). */
  clear: () => void;
  /** Καθαρισμός items ενός μόνο supplier (πχ partial checkout). */
  clearBySupplier: (supplierId: string) => void;
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set) => ({
      items: [],

      addItem: (input, qty = 1) => {
        set((state) => applyAddItem(state, input, qty, Date.now()));
      },

      setItemQty: (productId, qty) => {
        set((state) => applySetItemQty(state, productId, qty));
      },

      removeItem: (productId) => {
        set((state) => applyRemoveItem(state, productId));
      },

      clear: () => set({ items: [] }),

      clearBySupplier: (supplierId) => {
        set((state) => applyClearBySupplier(state, supplierId));
      },
    }),
    {
      name: "horeca-cart-v1",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist μόνο το data, όχι τα action functions
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

// ─── Re-exports: ο consumer δεν χρειάζεται να ξέρει το split ──────────────

export {
  selectGroupedBySupplier,
  selectItemCount,
  selectTotalEur,
  selectTotalQty,
  type CartItem,
  type CartItemInput,
  type CartSupplierGroup,
} from "@/lib/cart-selectors";

// ─── Convenience hooks ─────────────────────────────────────────────────────

/** Συντομογραφία για cases που θες ολόκληρο το items array. */
export const useCartItems = () => useCartStore((s) => s.items);

/** Reactive total qty για badge components. */
export const useCartTotalQty = () => useCartStore(selectTotalQty);

/** Reactive total EUR για summary bars. */
export const useCartTotalEur = () => useCartStore(selectTotalEur);
