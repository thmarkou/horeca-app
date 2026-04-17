# Changelog

Ιστορικό αλλαγών ανά ημέρα. Πιο πρόσφατες στην κορυφή.

---

## 2026-04-17 — Φάση S: Συνδρομή buyer (Model A, 2 tiers)

### Απόφαση στρατηγικής

- **Revenue model**: Α — buyer-funded SaaS (τα καταστήματα πληρώνουν, οι προμηθευτές παραμένουν δωρεάν).
- **Tiers**: 2 (Δωρεάν + Pro).
- **Pricing**: €9,90 / μήνα ή €89 / έτος (-25%, ~€7,42/μήνα ετήσιο).
- **Billing**: Mock-first — UI + API schema έτοιμα, πραγματικό billing με RevenueCat + StoreKit θα μπει πριν το TestFlight (15% Apple Small Business Program).

### Gating matrix (single source of truth: `lib/subscription.ts`)

| Feature | Δωρεάν | Pro | FeatureSet key |
|---|:-:|:-:|---|
| Παραγγελίες / μήνα | 10 | ∞ | `maxOrdersPerMonth` |
| Αποθηκευμένοι προμηθευτές | 3 | ∞ | `maxSavedSuppliers` |
| Καταστήματα | 1 | 5 | `maxLocations` |
| Team seats | 1 | 5 | `maxTeamSeats` |
| Ιστορικό παραδόσεων | 30 ημέρες | Πλήρες | `historyWindowDays` |
| Εξαγωγή PDF / CSV | — | ✓ | `canExportHistory` |
| Συγκριτικά κόστους | — | ✓ | `canCompareCosts` |
| Price alerts & ειδοποιήσεις αποθέματος | — | ✓ | `canSetPriceAlerts` |
| Προτεραιότητα στην υποστήριξη | — | ✓ | `prioritySupport` |

### S1 — Backend (`platform/app.ts`, `platform/db/schema.ts`, `scripts/seed-platform.ts`)

- Νέο table `subscriptions` — 1-to-1 με user, cascade delete, πεδία `plan`/`status`/`renewsAt`/`canceledAt`/`trialEndsAt`/`updatedAt`.
- `GET /api/me/subscription` με lazy auto-create (safety net για pre-existing users).
- Dev-only `POST /api/dev/subscription/activate` και `POST /api/dev/subscription/cancel` πίσω από `assertDevEnv` helper (`NODE_ENV !== "production"` → 404 σε production server).
- Auto-enrolment σε `free` plan στο `/api/auth/register`.
- Seed περιλαμβάνει subscription rows για τα demo accounts (buyer + supplier).
- `db:push` εκτελέστηκε — το schema μπήκε στο dev DB χωρίς data loss.

### S2 — Client foundation (`lib/subscription.ts`)

- Types `Subscription`, `SubscriptionPlan`, `SubscriptionStatus`, `FeatureSet`, `PlanDescriptor`.
- `DEFAULT_FREE_SUBSCRIPTION` constant — για graceful fallback σε unauthenticated state.
- `useSubscriptionQuery` — με 401/403 fallback, χωρίς null checks στα components.
- `useFeatures()` — επιστρέφει ολόκληρο `FeatureSet` βάσει τρέχοντος plan.
- `getFeaturesForSubscription(sub)` — pure helper για χρήση εκτός hooks.
- Mutations `useActivateProMutation` / `useCancelSubscriptionMutation` (δέχεται `{ immediate }`).
- `PLAN_CATALOG` με bullets που αντικατοπτρίζουν το matrix.
- Pricing constants (`PRO_PRICE_MONTHLY_EUR`, `PRO_PRICE_YEARLY_EUR`, `PRO_PRICE_YEARLY_MONTHLY_EUR`) σε ένα σημείο.

### S3 — UI (`app/subscription.tsx`, `app/(tabs)/account.tsx`)

- **Νέα οθόνη συνδρομής**: current plan card με «Λήγει στις …» ή «Επόμενη ανανέωση: …», billing cycle toggle (Μηνιαίο / Ετήσιο με δείκτη -25%), plan comparison cards με «Τρέχον» / «Προτεινόμενο» badges, upgrade CTA με cycle-aware τιμή στο label, destructive cancel με `Alert.alert`, legal fine print για το mock flow.
- **Buyer account screen**: αντικαταστάθηκε το παλιό «Δωρεάν demo» placeholder με πραγματικό `SubscriptionCard` που διαβάζει το real plan (badge Pro/Δωρεάν) και κάνει deep link στην οθόνη συνδρομής.

### S4 — Feature gating pilot (`components/ui/gated-action.tsx`, `app/(tabs)/orders.tsx`)

- **Reusable `<GatedAction>` component** — single decision point βάσει `useFeatures()`. Αν unlocked → καλεί callback. Αν locked → `Alert.alert` με CTA που στέλνει στο `/subscription`. Lock badge + accessibility label «(απαιτεί Pro)» μόνο όταν locked.
- **Pilot στο buyer orders tab**: «Εξαγωγή ιστορικού» πίσω από `canExportHistory` — πρώτη απόδειξη concept του gating pattern.
- Icon mappings: `lock.fill`, `star.circle.fill` στο `IconSymbol`.

### Follow-up: dev / demo shortcut για εύκολο testing

- Τα πραγματικά SaaS cancel flows (Apple, RevenueCat) διατηρούν Pro μέχρι το `renewsAt` — δεν γίνεται άμεσο downgrade γιατί ο user έχει πληρώσει.
- Αυτό είναι σωστό για production αλλά ενοχλεί σε demo/QA όταν θες να μπαινοβγαίνεις σε Pro για να δοκιμάσεις gated features.
- Προστέθηκε `{ immediate: boolean }` param στο dev cancel endpoint → όταν true, plan = free, status = expired, καθαρίζει renewsAt.
- UI: κίτρινο διακεκομμένο κουμπί **«Demo: επιστροφή σε Δωρεάν άμεσα»** κάτω από το κανονικό «Ακύρωση συνδρομής» όταν ο user είναι Pro.
- Αρχικά το button ήταν πίσω από `__DEV__` client-side gate, αλλά αφαιρέθηκε επειδή δεν είναι αξιόπιστο σε native Xcode Debug builds και η πραγματική προστασία είναι ήδη στο backend (`assertDevEnv`).

### Roadmap & tests

- `docs/DUAL_ROLE_ROADMAP.md`: νέα **Φάση S** με πλήρες gating matrix, S1-S4 ως completed, S5 (υπόλοιπα enforcements — monthly order counter, favorites cap, history window filter, multi-location, price alerts, cost comparison) και S6 (RevenueCat integration) ως follow-ups.
- 4 νέα regression tests (`tests/mobile-mvp.test.ts`) που κλειδώνουν: backend schema + endpoints + auto-enrolment + dev guards, client query/mutations/features exports, UI wiring (subscription screen + account integration), gating pattern (GatedAction + orders pilot).
- Έλεγχοι: `pnpm check` καθαρό, `pnpm test` 36/36 tests passing.

### Commits

- `59ca76a` — feat(subscription): buyer-funded 2-tier plans (free + pro) με mock billing
- `59a8a51` — feat(subscription): dev-only «άμεση επιστροφή σε Δωρεάν» για γρήγορο testing
- `d5765bb` — fix(subscription): το «Demo: επιστροφή σε Δωρεάν» button φαίνεται πάντα όταν είσαι Pro

### Pending για επόμενη συνεδρία

- S5 enforcements (όταν χτίζονται οι αντίστοιχες οθόνες / λειτουργίες).
- S6 πραγματικό billing με RevenueCat πριν TestFlight.
- Clean Xcode build στο iPhone για να φορτωθεί το τρέχον JS bundle στο physical device (το Metro hot reload δεν έπιασε σε αυτό το session — καταγραφή για follow-up αν επαναληφθεί).
