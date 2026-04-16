import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, apiRequest } from "@/lib/api/http";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SubscriptionPlan = "free" | "pro";
export type SubscriptionStatus = "active" | "canceled" | "expired" | "trialing";

/**
 * Ακριβές mirror του `mapSubscriptionRow` στο backend. Τα timestamps έρχονται
 * ως ISO strings ώστε το JSON να μη χάσει τύπο — ο client τα χειρίζεται μόνο
 * για display (formatDate) και όχι για υπολογισμούς εκτός UI.
 */
export type Subscription = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isPro: boolean;
  renewsAt: string | null;
  canceledAt: string | null;
  trialEndsAt: string | null;
  updatedAt: string;
};

export const DEFAULT_FREE_SUBSCRIPTION: Subscription = {
  plan: "free",
  status: "active",
  isPro: false,
  renewsAt: null,
  canceledAt: null,
  trialEndsAt: null,
  updatedAt: new Date(0).toISOString(),
};

// ─── Plan catalog (tier pricing + labels σε ένα σημείο) ─────────────────────

export const PRO_PRICE_MONTHLY_EUR = "9,90";
export const PRO_PRICE_YEARLY_EUR = "89,00";
// 89 / 12 ≈ 7,42 — δείχνουμε «κάτω από €7,50/μήνα» στο yearly CTA.
export const PRO_PRICE_YEARLY_MONTHLY_EUR = "7,42";

export type PlanDescriptor = {
  id: SubscriptionPlan;
  name: string;
  tagline: string;
  priceLabel: string;
  bullets: readonly string[];
};

export const PLAN_CATALOG: readonly PlanDescriptor[] = [
  {
    id: "free",
    name: "Δωρεάν",
    tagline: "Τα βασικά για να ξεκινήσεις — 1 κατάστημα, 1 χρήστης.",
    priceLabel: "€0 / μήνα",
    bullets: [
      "10 παραγγελίες / μήνα",
      "Έως 3 αποθηκευμένοι προμηθευτές",
      "Ιστορικό τελευταίων 30 ημερών",
      "1 κατάστημα · 1 χρήστης",
      "Επανάληψη παραγγελιών & αγαπημένα",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Όλα τα εργαλεία για ενεργά καταστήματα.",
    priceLabel: `€${PRO_PRICE_MONTHLY_EUR} / μήνα ή €${PRO_PRICE_YEARLY_EUR} / έτος`,
    bullets: [
      "Απεριόριστες παραγγελίες",
      "Απεριόριστοι αποθηκευμένοι προμηθευτές",
      "Πλήρες ιστορικό παραδόσεων",
      "Εξαγωγή PDF / CSV",
      "Συγκριτικά κόστους (μήνα / χρόνο)",
      "Price alerts & ειδοποιήσεις αποθέματος",
      "Έως 5 καταστήματα · 5 χρήστες",
      "Προτεραιότητα στην υποστήριξη",
    ],
  },
];

// ─── Feature matrix (single source of truth για gating) ─────────────────────

/**
 * Τα «όρια» που ορίζουν τη διαφορά μεταξύ free και pro. Κρατάμε ΕΝΑ mapping
 * ώστε όταν αλλάζουν tier limits, να μην ψάχνουμε σε πολλά αρχεία.
 * Το `Infinity` μεταφέρεται ως JSON serialization risk — γι' αυτό χρησιμοποιώ
 * `Number.POSITIVE_INFINITY` μέσα σε client code, ποτέ στο wire.
 */
export type FeatureSet = {
  /** Πόσες παραγγελίες το μήνα μπορεί να δημιουργήσει — `Infinity` σημαίνει χωρίς όριο. */
  maxOrdersPerMonth: number;
  maxSavedSuppliers: number;
  maxLocations: number;
  /** Επιπλέον χρήστες ανά λογαριασμό (team seats). */
  maxTeamSeats: number;
  /** Πόσες μέρες πίσω φαίνονται στο ιστορικό. */
  historyWindowDays: number;
  canExportHistory: boolean;
  canSetPriceAlerts: boolean;
  /** Συγκριτικά κόστους ανά μήνα/χρόνο στο dashboard. */
  canCompareCosts: boolean;
  prioritySupport: boolean;
};

const FREE_FEATURES: FeatureSet = {
  maxOrdersPerMonth: 10,
  maxSavedSuppliers: 3,
  maxLocations: 1,
  maxTeamSeats: 1,
  historyWindowDays: 30,
  canExportHistory: false,
  canSetPriceAlerts: false,
  canCompareCosts: false,
  prioritySupport: false,
};

const PRO_FEATURES: FeatureSet = {
  maxOrdersPerMonth: Number.POSITIVE_INFINITY,
  maxSavedSuppliers: Number.POSITIVE_INFINITY,
  maxLocations: 5,
  maxTeamSeats: 5,
  historyWindowDays: Number.POSITIVE_INFINITY,
  canExportHistory: true,
  canSetPriceAlerts: true,
  canCompareCosts: true,
  prioritySupport: true,
};

export function getFeaturesForSubscription(sub: Subscription | null | undefined): FeatureSet {
  return sub?.isPro ? PRO_FEATURES : FREE_FEATURES;
}

// ─── React Query hooks ─────────────────────────────────────────────────────

export const subscriptionQueryKeys = {
  me: ["horeca", "subscription", "me"] as const,
};

/**
 * Φέρνει το current subscription για τον authenticated user. Όταν ο χρήστης
 * δεν είναι logged-in (401/403) επιστρέφουμε το default free — έτσι το UI
 * μπορεί να ρωτήσει `features.canExportHistory` χωρίς null checks.
 */
export function useSubscriptionQuery() {
  return useQuery({
    queryKey: subscriptionQueryKeys.me,
    queryFn: async (): Promise<Subscription> => {
      try {
        const data = await apiRequest<{ subscription: Subscription }>(
          "/api/me/subscription",
          { auth: true },
        );
        return data.subscription;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          return DEFAULT_FREE_SUBSCRIPTION;
        }
        throw e;
      }
    },
  });
}

/**
 * Βολικό combined hook για components: επιστρέφει κατευθείαν το feature set
 * χωρίς να χρειάζονται ξεχωριστά query + branching.
 */
export function useFeatures(): FeatureSet {
  const { data } = useSubscriptionQuery();
  return getFeaturesForSubscription(data);
}

// ─── Mock billing mutations (dev-only, για demo) ───────────────────────────
//
// Όταν μπει RevenueCat/StoreKit:
// - `useActivateProMutation` → γίνεται `Purchases.purchase(package)`
// - `useCancelSubscriptionMutation` → deep-link στο App Store manage screen
// Η υπόλοιπη app (query key, shape) παραμένει ίδια.

export function useActivateProMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { months?: number } = {}) => {
      const data = await apiRequest<{ subscription: Subscription }>(
        "/api/dev/subscription/activate",
        {
          method: "POST",
          body: JSON.stringify({ plan: "pro", months: input.months ?? 1 }),
          auth: true,
        },
      );
      return data.subscription;
    },
    onSuccess: (subscription) => {
      queryClient.setQueryData(subscriptionQueryKeys.me, subscription);
    },
  });
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { immediate?: boolean } = {}) => {
      const data = await apiRequest<{ subscription: Subscription }>(
        "/api/dev/subscription/cancel",
        {
          method: "POST",
          body: JSON.stringify({ immediate: input.immediate ?? false }),
          auth: true,
        },
      );
      return data.subscription;
    },
    onSuccess: (subscription) => {
      queryClient.setQueryData(subscriptionQueryKeys.me, subscription);
    },
  });
}

