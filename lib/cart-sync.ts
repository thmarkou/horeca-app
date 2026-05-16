/**
 * Server-side cart sync layer (Phase 1.2).
 *
 * Αρχιτεκτονική:
 * - `useCartStore` (Zustand + AsyncStorage) παραμένει source of truth για
 *   το UI — instant reads, χωρίς network latency.
 * - Αυτό το module **wrap-άρει** τις store actions ώστε κάθε αλλαγή να
 *   κάνει write-through στον server.
 * - Στο bootstrap (login / app cold-start), το `bootstrapCartFromServer`
 *   φέρνει την authoritative cart του χρήστη από το backend, αντικαθιστώντας
 *   το local state.
 *
 * Γιατί όχι React Query: το cart είναι UI state με instant mutations από
 * πολλά screens (catalog, product-detail, cart). Διπλή cache (Zustand +
 * React Query) θα έφερνε bugs sync. Το Zustand store κρατά την αλήθεια
 * client-side, ο server κρατά την αλήθεια cross-device — η sync layer
 * εδώ είναι ο γέφυρα.
 *
 * Failure mode: network errors swallow-άρονται με warn (όχι throw). Ο user
 * βλέπει instant local update· αν το server κάλεσμα αποτύχει, θα reconcile
 * στο επόμενο bootstrap. Για B2B cart αυτό είναι αποδεκτό — δεν είναι
 * πληρωμή ή ευαίσθητη ροή.
 */

import { ApiError, apiRequest } from "@/lib/api/http";
import * as Auth from "@/lib/_core/auth";
import {
  useCartStore,
  type CartItem,
  type CartItemInput,
} from "@/lib/cart-store";

type CartResponse = { items: CartItem[] };

/**
 * Όταν `true`, οι wrapped actions παρακάμπτουν την κλήση στο server —
 * χρησιμοποιείται μόνο κατά τη διάρκεια του bootstrap ώστε το `setState`
 * που γράφει τα fetched items να μη δημιουργήσει write-back loop.
 */
let isHydrating = false;

/**
 * Cheap pre-flight check — αν δεν υπάρχει token, μη κάνεις τη network call.
 * Αποφεύγει spam στο console σε pre-login browsing και ορατά error logs.
 */
async function hasAuth(): Promise<boolean> {
  const token = await Auth.getSessionToken();
  return Boolean(token);
}

async function pushItemToServer(productId: string, qty: number): Promise<void> {
  if (isHydrating) return;
  if (!(await hasAuth())) return;
  try {
    await apiRequest(`/api/me/cart/items/${productId}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ qty }),
    });
  } catch (e) {
    // 401: ο user δεν είναι authenticated (stale token). 403: supplier
    // δεν έχει cart — συμβαίνει αν supplier καταλήξει εδώ από bug, αλλά
    // δεν θέλουμε crash. 404: το product διαγράφηκε — local state ήδη
    // πιάνει αυτή την αλλαγή στην επόμενη hydration.
    if (
      e instanceof ApiError &&
      (e.status === 401 || e.status === 403 || e.status === 404)
    ) {
      return;
    }
    console.warn("[cart-sync] push failed", productId, qty, e);
  }
}

/** Local + server: προσθήκη ή increment item. */
export async function syncedAddItem(input: CartItemInput, qty = 1): Promise<void> {
  useCartStore.getState().addItem(input, qty);
  // Διαβάζουμε το τελικό qty μετά την local action — αν το item υπήρχε
  // ήδη, το addItem έχει κάνει increment, όχι replace. Το server θέλει το
  // απόλυτο final qty, όχι το delta.
  const finalItem = useCartStore
    .getState()
    .items.find((i) => i.productId === input.productId);
  if (!finalItem) return;
  await pushItemToServer(input.productId, finalItem.qty);
}

/** Local + server: άμεση αλλαγή ποσότητας (qty<=0 → remove). */
export async function syncedSetItemQty(productId: string, qty: number): Promise<void> {
  useCartStore.getState().setItemQty(productId, qty);
  // Στο server, qty=0 ισοδυναμεί με delete (το PUT endpoint χειρίζεται και
  // τα δύο μέσω της ίδιας οδού — idempotent).
  await pushItemToServer(productId, Math.max(0, qty));
}

/** Local + server: πλήρης αφαίρεση item. */
export async function syncedRemoveItem(productId: string): Promise<void> {
  useCartStore.getState().removeItem(productId);
  await pushItemToServer(productId, 0);
}

/** Local + server: καθαρισμός όλων των items ενός supplier (μετά από checkout). */
export async function syncedClearBySupplier(supplierId: string): Promise<void> {
  useCartStore.getState().clearBySupplier(supplierId);
  if (isHydrating) return;
  if (!(await hasAuth())) return;
  try {
    await apiRequest(`/api/me/cart/supplier/${supplierId}`, {
      method: "DELETE",
      auth: true,
    });
  } catch (e) {
    if (
      e instanceof ApiError &&
      (e.status === 401 || e.status === 403 || e.status === 404)
    ) {
      return;
    }
    console.warn("[cart-sync] clearBySupplier failed", supplierId, e);
  }
}

/** Local + server: καθαρισμός όλου του cart. */
export async function syncedClear(): Promise<void> {
  useCartStore.getState().clear();
  if (isHydrating) return;
  if (!(await hasAuth())) return;
  try {
    await apiRequest("/api/me/cart", { method: "DELETE", auth: true });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return;
    console.warn("[cart-sync] clear failed", e);
  }
}

/**
 * Καθαρίζει **μόνο τοπικά** χωρίς network call. Χρησιμοποιείται στο
 * signOut() ώστε ο επόμενος χρήστης στην ίδια συσκευή να μη βλέπει το
 * cart του προηγούμενου (cross-user leak fix).
 */
export function clearCartLocal(): void {
  useCartStore.getState().clear();
}

/**
 * Bootstrap από server — καλείται **μετά από login** ή σε **app cold-start
 * για authenticated buyer**.
 *
 * Strategy:
 *   1. Fetch server cart.
 *   2. Αν server έχει items → αντικατάσταση local (server wins, cross-device
 *      consistency).
 *   3. Αν server κενός + local έχει items → push local up («δεν χάνω ό,τι
 *      πρόσθεσα πριν login» — συμβαίνει αν ο user browsed pre-auth).
 *
 * Caller πρέπει να το ξέρει ότι είναι authenticated buyer. Σε error δεν
 * crash-άρει — απλά αφήνει local cart ως είναι.
 */
export async function bootstrapCartFromServer(): Promise<void> {
  if (!(await hasAuth())) return;
  isHydrating = true;
  try {
    const data = await apiRequest<CartResponse>("/api/me/cart", { auth: true });
    const local = useCartStore.getState().items;

    if (data.items.length > 0) {
      // Server wins: ο χρήστης έχει cart σε άλλη συσκευή ή προηγούμενη session.
      useCartStore.setState({ items: data.items });
    } else if (local.length > 0) {
      // Server κενός — έχουμε pre-login local items. Push up.
      for (const item of local) {
        try {
          await apiRequest(`/api/me/cart/items/${item.productId}`, {
            method: "PUT",
            auth: true,
            body: JSON.stringify({ qty: item.qty }),
          });
        } catch (e) {
          console.warn("[cart-sync] failed to push local item", item.productId, e);
        }
      }
      // Re-fetch ώστε το updatedAt/timestamps να ταιριάξουν με server
      // (διαφορετικά μπορεί να δούμε φευγαλέα διαφορετική σειρά στο επόμενο
      // render αν αλλάξει το addedAt).
      try {
        const refreshed = await apiRequest<CartResponse>("/api/me/cart", { auth: true });
        useCartStore.setState({ items: refreshed.items });
      } catch {
        // OK — local already matches what we pushed.
      }
    }
  } catch (e) {
    // 401/403: όχι authenticated buyer — δεν είναι error, απλά skip.
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      return;
    }
    console.warn("[cart-sync] bootstrap failed", e);
  } finally {
    isHydrating = false;
  }
}
