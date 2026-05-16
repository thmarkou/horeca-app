import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Router } from "expo-router";

import * as Auth from "@/lib/_core/auth";
import { bootstrapCartFromServer } from "@/lib/cart-sync";

export type HorecaAccountRole = "buyer" | "supplier";

const ROLE_KEY = "horeca-source-demo-role";
const COMPANY_KEY = "horeca-source-demo-company";

export async function getStoredHorecaRole(): Promise<HorecaAccountRole> {
  const r = await AsyncStorage.getItem(ROLE_KEY);
  return r === "supplier" ? "supplier" : "buyer";
}

/** Prefer SecureStore user (API); fall back to legacy AsyncStorage from sign-up demo. */
export async function getSessionHorecaRole(): Promise<HorecaAccountRole> {
  const user = await Auth.getUserInfo();
  if (user) return user.role;
  return getStoredHorecaRole();
}

export async function setStoredHorecaProfile(role: HorecaAccountRole, companyName: string) {
  await AsyncStorage.multiSet([
    [ROLE_KEY, role],
    [COMPANY_KEY, companyName],
  ]);
}

export async function clearStoredHorecaProfile() {
  await AsyncStorage.multiRemove([ROLE_KEY, COMPANY_KEY]);
}

/**
 * After login or register: route by API-backed role (SecureStore) or explicit override.
 * Suppliers use dedicated tab shell `/(supplier-tabs)`.
 *
 * Side-effect: για buyer role, ξεκινάει cart bootstrap από server (Phase 1.2)
 * ώστε ο χρήστης να βλέπει το cart του αμέσως μετά το login — ανεξάρτητα
 * συσκευής. Fire-and-forget για να μη μπλοκάρει η πλοήγηση· αν αποτύχει,
 * το local cart παραμένει όπως είναι.
 */
export async function navigateAfterHorecaAuth(
  router: Pick<Router, "replace">,
  roleOverride?: HorecaAccountRole,
) {
  const role = roleOverride ?? (await getSessionHorecaRole());
  if (role === "supplier") {
    router.replace("/(supplier-tabs)");
    return;
  }
  // Hydrate cart πριν φτάσει ο user στις buyer tabs ώστε το πρώτο
  // CartSummaryBar / Cart screen render να βλέπει τα synced items.
  // Δεν αναμένουμε — η αλλαγή στο Zustand store θα κάνει trigger re-render
  // όταν τα δεδομένα φτάσουν.
  void bootstrapCartFromServer();
  router.replace("/(tabs)");
}
