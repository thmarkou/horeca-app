/**
 * Time-aware Greek greeting + first-name extraction utilities.
 *
 * Split out so both the Buyer Home and the Supplier Dashboard can reuse
 * the exact same wording, and so the logic is trivially unit-testable
 * (no React / Date.now mocking boilerplate in screens).
 */

export type GreetingWindow = "morning" | "afternoon" | "evening";

export function getGreetingWindow(hour: number): GreetingWindow {
  if (hour >= 5 && hour < 13) return "morning";
  if (hour >= 13 && hour < 19) return "afternoon";
  return "evening";
}

const GREETING_LABEL: Record<GreetingWindow, string> = {
  morning: "Καλημέρα",
  afternoon: "Καλησπέρα",
  evening: "Καλό βράδυ",
};

export function getGreetingForDate(date: Date = new Date()): string {
  return GREETING_LABEL[getGreetingWindow(date.getHours())];
}

/**
 * Returns the first non-empty token of the display name so we can address
 * the user on a first-name basis. Falls back to the provided default when
 * the name is missing / empty (e.g. OAuth profiles without a real name).
 */
export function getFirstName(fullName: string | null | undefined, fallback = "φίλε"): string {
  if (!fullName) return fallback;
  const trimmed = fullName.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] ?? fallback;
}
