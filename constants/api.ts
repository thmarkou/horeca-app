import Constants from "expo-constants";
import * as Device from "expo-device";
import { NativeModules, Platform } from "react-native";

type HorecaExpoExtra = { horecaApiPort?: string; horecaApiBaseUrl?: string };

function horecaExtra(): HorecaExpoExtra {
  const x = Constants.expoConfig?.extra;
  if (x && typeof x === "object") return x as HorecaExpoExtra;
  return {};
}

function resolveApiPort(): string {
  // Prefer Metro-inlined EXPO_PUBLIC_* (fresh) over native manifest extra (can be stale after Xcode builds).
  const fromEnv =
    process.env.EXPO_PUBLIC_DEV_API_PORT ?? process.env.EXPO_PUBLIC_PLATFORM_PORT ?? "";
  if (fromEnv) return fromEnv;
  const fromConfig = horecaExtra().horecaApiPort;
  if (fromConfig) return fromConfig;
  return "3000";
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** Host where Metro runs (your Mac on LAN). On a physical phone, 127.0.0.1 is the phone itself, not the Mac. */
function getExpoPackagerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri === "string" && hostUri.length > 0) {
    const host = hostUri.split(":")[0]?.trim();
    if (host && !isLoopbackHost(host)) return host;
  }
  const scriptURL = (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode?.scriptURL;
  if (typeof scriptURL === "string") {
    try {
      const m = scriptURL.match(/\/\/([^/]+)\//);
      const hostWithPort = m?.[1];
      const hostname = hostWithPort?.split(":")[0];
      if (hostname && !isLoopbackHost(hostname)) return hostname;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function iosLanHostForApi(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_DEV_LAN_HOST?.trim();
  if (fromEnv && !isLoopbackHost(fromEnv)) return fromEnv;
  return getExpoPackagerHost();
}

/** If the user set http://127.0.0.1:PORT (fine for Simulator), rewrite to the Mac LAN IP for a real device. */
function rewriteIosLoopbackBaseUrl(explicit: string): string {
  const trimmed = explicit.replace(/\/$/, "");
  try {
    const withScheme = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
    const u = new URL(withScheme);
    if (!isLoopbackHost(u.hostname)) return trimmed;
    const lan = iosLanHostForApi();
    if (!lan) return trimmed;
    u.hostname = lan;
    return u.origin.replace(/\/$/, "");
  } catch {
    return trimmed;
  }
}

function iosDevApiBase(port: string): string {
  const lan = iosLanHostForApi();
  if (lan) return `http://${lan}:${port}`;
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // Real iPhone cannot use 127.0.0.1 to reach the Mac; Simulator can.
    if (Device.isDevice) return "";
    return `http://127.0.0.1:${port}`;
  }
  return "";
}

function iosExplicitStillLoopback(url: string): boolean {
  try {
    const u = new URL(url.includes("://") ? url : `http://${url}`);
    return isLoopbackHost(u.hostname);
  } catch {
    return false;
  }
}

/** Central platform API (Hono + SQLite). Port comes from app.config extra (synced with PORT) or EXPO_PUBLIC_*. */
export function getApiBaseUrl(): string {
  const extra = horecaExtra();
  let explicit =
    process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    extra.horecaApiBaseUrl?.replace(/\/$/, "") ||
    "";
  if (explicit && Platform.OS === "ios") {
    explicit = rewriteIosLoopbackBaseUrl(explicit);
    if (
      typeof __DEV__ !== "undefined" &&
      __DEV__ &&
      Device.isDevice &&
      iosExplicitStillLoopback(explicit)
    ) {
      explicit = "";
    }
  }
  if (explicit) return explicit;

  const port = resolveApiPort();

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${port}`;
  }

  if (Platform.OS === "ios") {
    return iosDevApiBase(port);
  }

  return "";
}
