import { ApiError, apiRequest } from "@/lib/api/http";
import * as Auth from "./auth";

export type AuthApiUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
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

export async function getMe(): Promise<AuthApiUser | null> {
  const cached = await Auth.getUserInfo();
  if (cached) {
    return {
      id: cached.id,
      openId: cached.openId,
      name: cached.name,
      email: cached.email,
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
