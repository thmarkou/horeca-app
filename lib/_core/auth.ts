import * as SecureStore from "expo-secure-store";

import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/storage";

export type HorecaUserRole = "buyer" | "supplier";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  /** From platform `users.role`; older cached profiles may omit — treated as buyer. */
  role: HorecaUserRole;
  loginMethod: string | null;
  lastSignedIn: Date;
};

export async function getSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function removeSessionToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function normalizeUserPayload(raw: unknown): User | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const role: HorecaUserRole = o.role === "supplier" ? "supplier" : "buyer";
  const lastSignedIn = o.lastSignedIn;
  const d =
    typeof lastSignedIn === "string"
      ? new Date(lastSignedIn)
      : lastSignedIn instanceof Date
        ? lastSignedIn
        : new Date();
  if (typeof o.id !== "number" || typeof o.openId !== "string") return null;
  return {
    id: o.id,
    openId: o.openId,
    name: typeof o.name === "string" ? o.name : o.name == null ? null : String(o.name),
    email: typeof o.email === "string" ? o.email : o.email == null ? null : String(o.email),
    role,
    loginMethod:
      typeof o.loginMethod === "string" ? o.loginMethod : o.loginMethod == null ? null : String(o.loginMethod),
    lastSignedIn: d,
  };
}

export async function getUserInfo(): Promise<User | null> {
  try {
    const info = await SecureStore.getItemAsync(USER_INFO_KEY);
    if (!info) return null;
    return normalizeUserPayload(JSON.parse(info));
  } catch {
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
}

export async function clearUserInfo(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch {
    /* ignore */
  }
}
