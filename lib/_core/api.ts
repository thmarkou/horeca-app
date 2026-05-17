import { ApiError, apiRequest } from "@/lib/api/http";
import { clearActiveBuyerLocationsFromDevice } from "@/lib/active-buyer-location";
import { clearCartLocal } from "@/lib/cart-sync";
import { clearStoredHorecaProfile } from "@/lib/horeca-stored-role";
import { clearAllPushTokensOnServer } from "@/lib/push-notifications";

import * as Auth from "./auth";

export type AuthApiUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "buyer" | "supplier";
  loginMethod: string | null;
  lastSignedIn: string;
};

export async function logout(): Promise<void> {
  try {
    await apiRequest("/api/auth/logout", { method: "POST", auth: true });
  } catch {
    /* offline / unknown route */
  }
}

/**
 * Clears remote session (best effort), local tokens, και legacy demo
 * AsyncStorage profile. Επιπλέον καθαρίζει το **local cart** ώστε ο επόμενος
 * χρήστης στην ίδια συσκευή να μη βλέπει τα items του προηγούμενου
 * (cross-user leak — bug που υπήρχε πριν τη Φάση 1.2 server-sync). Δεν
 * αγγίζει το server cart — αυτό παραμένει intact για να ξαναφορτωθεί όταν
 * Ο user επίσης χάνει την επιλογή active buyer location (φάση 3.1) ώστε ο
 * επόμενος login να ξανά-συγχρονίσει από server default. **Πριν** σβηστεί το
 * JWT, καλεί `clearAllPushTokensOnServer` ώστε να μη μείνουν Expo tokens στον server.
 */
export async function signOut(): Promise<void> {
  await clearAllPushTokensOnServer();
  await logout();
  await Auth.clearUserInfo();
  await Auth.removeSessionToken();
  await clearStoredHorecaProfile();
  await clearActiveBuyerLocationsFromDevice();
  clearCartLocal();
}

export async function getMe(): Promise<AuthApiUser | null> {
  const cached = await Auth.getUserInfo();
  if (cached) {
    return {
      id: cached.id,
      openId: cached.openId,
      name: cached.name,
      email: cached.email,
      role: cached.role,
      loginMethod: cached.loginMethod,
      lastSignedIn:
        cached.lastSignedIn instanceof Date
          ? cached.lastSignedIn.toISOString()
          : String(cached.lastSignedIn),
    };
  }
  try {
    const data = await apiRequest<{ user: AuthApiUser | null }>("/api/auth/me", { auth: true });
    return data.user ?? null;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    return null;
  }
}

export async function applyAuthApiResult(result: {
  app_session_id: string;
  user: AuthApiUser;
}): Promise<void> {
  if (
    typeof result.user.id !== "number" ||
    !Number.isFinite(result.user.id) ||
    result.user.id < 1
  ) {
    throw new Error("Invalid auth response: missing user id.");
  }
  const userInfo: Auth.User = {
    id: result.user.id,
    openId: result.user.openId,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role === "supplier" ? "supplier" : "buyer",
    loginMethod: result.user.loginMethod,
    lastSignedIn: new Date(result.user.lastSignedIn),
  };
  await Auth.setUserInfo(userInfo);
  await Auth.setSessionToken(result.app_session_id);
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<{ app_session_id: string; user: AuthApiUser }> {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  name: string,
  role?: "buyer" | "supplier",
): Promise<{ app_session_id: string; user: AuthApiUser }> {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, role: role ?? "buyer" }),
  });
}
