import { getApiBaseUrl } from "@/constants/api";
import * as Auth from "@/lib/_core/auth";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_REQUEST_TIMEOUT_MS = 25_000;

/**
 * Local dev only (physical device + API on your machine). Not shown in App Store builds.
 * Production uses a hosted HTTPS API — users never configure Mac firewall or LAN IP.
 */
const HORECA_API_TIMEOUT_MESSAGE_GR_DEV =
  "\u0397 \u03b1\u03af\u03c4\u03b7\u03c3\u03b7 \u03ad\u03bb\u03b7\u03be\u03b5 \u03c7\u03c9\u03c1\u03af\u03c2 \u03b1\u03c0\u03ac\u03bd\u03c4\u03b7\u03c3\u03b7 (\u03bb\u03ae\u03be\u03b7 \u03c7\u03c1\u03cc\u03bd\u03bf\u03c5). \u0391\u03bd \u03b1\u03bd\u03b1\u03c0\u03c4\u03cd\u03c3\u03b5\u03c4\u03b5 \u03c4\u03bf\u03c0\u03b9\u03ba\u03ac: \u03af\u03b4\u03b9\u03bf Wi\u2011Fi \u03bc\u03b5 \u03c4\u03bf Mac, \u03c4\u03c1\u03ad\u03c7\u03bf\u03bd pnpm dev (\u03c0\u03bb\u03b1\u03c4\u03c6\u03cc\u03c1\u03bc\u03b1), \u03c3\u03c9\u03c3\u03c4\u03ae \u03c4\u03bf\u03c0\u03b9\u03ba\u03ae IP \u03c3\u03c4\u03bf EXPO_PUBLIC_API_BASE_URL \u03ba\u03b1\u03b9 \u03c0\u03cc\u03c1\u03c4\u03b1 \u03c0\u03bb\u03b1\u03c4\u03c6\u03cc\u03c1\u03bc\u03b1\u03c2 (\u03c0.\u03c7. :3010).";

/** App Store / release: generic network message — no developer-machine steps. */
const HORECA_API_TIMEOUT_MESSAGE_GR_PROD =
  "\u0397 \u03b1\u03af\u03c4\u03b7\u03c3\u03b7 \u03ad\u03bb\u03b7\u03be\u03b5 \u03c7\u03c9\u03c1\u03af\u03c2 \u03b1\u03c0\u03ac\u03bd\u03c4\u03b7\u03c3\u03b7. \u0395\u03bb\u03ad\u03b3\u03be\u03c4\u03b5 \u03c4\u03b7 \u03c3\u03cd\u03bd\u03b4\u03b5\u03c3\u03ae \u03b4\u03b5\u03b4\u03bf\u03bc\u03ad\u03bd\u03c9\u03bd \u03ae Wi\u2011Fi \u03ba\u03b1\u03b9 \u03b4\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03be\u03b1\u03bd\u03ac \u03b1\u03c1\u03b3\u03cc\u03c4\u03b5\u03c1\u03b1.";

export function getHorecaApiTimeoutMessageGr(): string {
  return typeof __DEV__ !== "undefined" && __DEV__
    ? HORECA_API_TIMEOUT_MESSAGE_GR_DEV
    : HORECA_API_TIMEOUT_MESSAGE_GR_PROD;
}

function isLikelyTimeoutError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "AbortError") return true;
  const m = e.message.toLowerCase();
  return (
    m.includes("network request timed out") ||
    m.includes("request timed out") ||
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("aborted")
  );
}

function joinUrl(base: string, path: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(
      "\u039b\u03b5\u03af\u03c0\u03b5\u03b9 \u03c4\u03bf API. \u03a4\u03c1\u03ad\u03be\u03c4\u03b5 pnpm dev (\u03c0\u03bb\u03b1\u03c4\u03c6\u03cc\u03c1\u03bc\u03b1 + Metro) \u03ae \u03bf\u03c1\u03af\u03c3\u03c4\u03b5 EXPO_PUBLIC_API_BASE_URL.",
      0,
    );
  }
  const { auth = false, headers: hdr, ...rest } = init;
  const headers = new Headers(hdr);
  if (!headers.has("Content-Type") && rest.body) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await Auth.getSessionToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = joinUrl(base, path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  const { signal: _ignore, ...restWithoutSignal } = rest;
  let res: Response;
  try {
    res = await fetch(url, { ...restWithoutSignal, headers, signal: controller.signal });
  } catch (e) {
    if (isLikelyTimeoutError(e)) {
      throw new ApiError(getHorecaApiTimeoutMessageGr(), 0);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* raw */
    }
    throw new ApiError(msg || res.statusText, res.status);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
