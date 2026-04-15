import * as SecureStore from "expo-secure-store";

import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/storage";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
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

export async function getUserInfo(): Promise<User | null> {
  try {
    const info = await SecureStore.getItemAsync(USER_INFO_KEY);
    if (!info) return null;
    return JSON.parse(info) as User;
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
