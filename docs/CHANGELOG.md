# Changelog

Ιστορικό αλλαγών ανά ημέρα. Πιο πρόσφατες στην κορυφή.

---

## 2026-05-17 — Φάση 1.1 (polish προμηθευτών) + Φάση 1.2 (server-side cart sync)

Πλήρης ανάταξη στημένων σεναρίων χειροκίνητης δοκιμής στο **[`session-2026-05-17.md`](./session-2026-05-17.md)**.

Σύντομα:

- **1.1:** `isOnboarded` στο API, ρυθμίσεις `SupplierCard` / προφίλ / λίστας προμηθευτών (φόρτωση, count, καθάρισμα φίλτρων, αυστηρός έλεγχος `supplierId`).
- **1.2:** πίνακας `cart_items`, authenticated cart API (buyers), `cart-sync.ts` με bootstrap μετά από login για buyer, έξοδος καθαρίζει τοπικό καλάθι, checkout με ροή περίληψης + προειδοποίηση MOQ χωρίς hard block· `lib/cart-pricing.ts`.

---

## 2026-04-17 (απόγευμα) — Φάση 1: Demo-ready MVP (B2 + testing guide + χάρτης + crash fixes)

### Στόχος session

Ολοκλήρωση της Φάσης 1 από το `docs/WORK_REMAINING.md`: buyer-facing polish στο supplier list / profile, εγχειρίδιο για testers, χάρτης στο προφίλ προμηθευτή, και σταθεροποίηση του app σε physical iPhone (clean Xcode build).

### B2a — Reusable `SupplierCard` (`components/ui/supplier-card.tsx` + `app/(tabs)/suppliers.tsx`)

- Νέο component με avatar initials, verified badge, star rating (`supplier.rating.toFixed(1)`), category tag, highlight tagline, metadata row (pin / delivery / MOQ) και CTA «Άνοιγμα καταλόγου» με chevron.
- Αντικατέστησε το inline rendering στο suppliers tab → καθαρότερη αρχιτεκτονική, ένα σημείο αλλαγής για όλες τις οθόνες που δείχνουν supplier card.
- Νέα icon mappings στο `IconSymbol`: `star.fill`, `checkmark.seal.fill`, `mappin.and.ellipse`.

### B2b — Redesign supplier profile (`app/supplier-profile.tsx`)

- Loading state με `ActivityIndicator` (αντί για κενή οθόνη κατά το fetch).
- Hero card: 64×64 avatar με initials, όνομα, verified badge, star rating, highlight tagline, `mappin` + location.
- 3-stat grid (`StatTile`) για Κατηγορία / Παράδοση / MOQ — ίσου πλάτους tiles, σταθερή ιεραρχία.
- Κατάλογος προμηθευτή με product cards (όνομα, μονάδα, τιμή, availability pill, chevron).
- Empty state για suppliers χωρίς προϊόντα («Ο προμηθευτής δεν έχει δημοσιεύσει ακόμη προϊόντα.»).

### B2c — Χάρτης στο προφίλ προμηθευτή

**Schema + data layer:**

- `platform/db/schema.ts`: νέα nullable `real` στήλες `latitude` / `longitude` στον `suppliers` (backwards compatible με legacy rows).
- `lib/mocks/horeca.ts`: `Supplier` type αποκτά optional lat/lng + πραγματικές συντεταγμένες για τους 3 demo suppliers (Αθήνα, Θεσσαλονίκη, Πειραιάς).
- `scripts/seed-platform.ts`: περνάει τα νέα πεδία με `?? null` fallback ώστε supplies χωρίς geo να μην σπάνε το seed.
- `platform/app.ts` (`mapSupplierRow`): συμπεριλαμβάνει lat/lng μόνο όταν υπάρχουν, διατηρώντας καθαρό client contract (`latitude?: number`).

**Νέο component (`components/ui/supplier-map.tsx`):**

- Fixed-height, non-interactive `MapView` με pin στη θέση του προμηθευτή.
- `scrollEnabled` / `zoomEnabled` / `rotateEnabled` / `pitchEnabled` = false → δεν συγκρούεται με το parent `ScrollView`.
- `TouchableOpacity` wrap: tap οπουδήποτε → deep link (`maps://` σε iOS, `geo:` σε Android) ανοίγει native Maps με pre-selected location.
- Footer με location + «Άνοιγμα στους Χάρτες» CTA.
- Ενσωμάτωση στο profile μόνο όταν `supplier.latitude` και `supplier.longitude` είναι defined.

**Native dependency:**

- Προστέθηκε `react-native-maps@1.20.1` (σταθερή version συμβατή με Expo SDK 54 + iOS 15.1+).

### Testing guide (`docs/TESTING_GUIDE.md`)

Νέο αρχείο 1 σελίδας για testers:

- Demo credentials (`buyer@horeca.demo` / `supplier@horeca.demo`, κοινό password `demo1234`).
- Πρόσβαση (δοκιμαστικό build μέσω Xcode, URL Metro/backend).
- Buyer checklist: navigation, filters, order flow, subscription upgrade/downgrade (συμπ. «άμεση επιστροφή σε Δωρεάν» για εύκολο testing).
- Supplier checklist: catalog CRUD (C4c), toggle availability (C4b).
- Known demo limitations (mock billing, δεν υπάρχει real payment).
- Bug reporting template + testing tips (db reset, IP change, Xcode rebuild).

### Crash fixes (σημερινού feedback session)

**1. FOREIGN KEY constraint στο `/api/me/subscription` (`platform/app.ts`)**

- **Root cause**: `getOrCreateSubscription` έκανε `INSERT INTO subscriptions` με `user_id` από stale JWT token — ο user είχε διαγραφεί από προηγούμενο `db:seed`, οπότε το FK έσκαγε σε 500.
- **Fix**: Έλεγχος ύπαρξης στο `users` table πριν το insert. Αν ο user δεν υπάρχει πια, το endpoint γυρνάει καθαρό `401`. Ο client ήδη fallback-άρει σε `DEFAULT_FREE_SUBSCRIPTION` για 401/403 — zero breakage στο UI.
- Ίδιος guard μπήκε και στα `/api/dev/subscription/activate` και `/api/dev/subscription/cancel`.

**2. Native crash στο tap προμηθευτή (`components/ui/supplier-map.tsx`)**

- **Root cause**: Το `react-native-maps` εγγράφει native view manager `AIRMap`. Όταν το JS bundle τρέχει σε binary χωρίς pod installed (stale Xcode build, Expo Go), το `<MapView>` σκάει σε native invariant violation που **δεν πιάνεται από JS try/catch ούτε React ErrorBoundary** — είναι κάτω από το JS layer.
- **Fix**: `UIManager.hasViewManagerConfig("AIRMap")` check **πριν** το `require()`. Αν το native manager λείπει, δεν αγγίζουμε καθόλου το package και δείχνουμε fallback UI (pin icon + «Προβολή στους Χάρτες» CTA με deep link).
- Αυτό κάνει το app resilient απέναντι σε stale binaries — ο χρήστης βλέπει placeholder αντί για crash μέχρι να γίνει rebuild.

### iOS rebuild (native dependency installation)

- `brew install cocoapods` — bypass του macOS system Ruby 2.6 που δεν στηρίζει νέα CocoaPods (απαιτεί Ruby 3.1+). Το Homebrew φέρνει το δικό του Ruby χωρίς `sudo` / system conflicts.
- `pod install --repo-update` για fresh lock + pickup του `react-native-maps` μέσω Expo autolinking.
- Καθάρισμα `~/Library/Developer/Xcode/DerivedData` για να ξεπεραστεί το `MsgHandlingError: unable to initiate PIF transfer session` stale-cache bug.
- Clean Build Folder + Run → ο διαδραστικός χάρτης φορτώνει κανονικά στο physical iPhone.

### Regression tests (`tests/mobile-mvp.test.ts`)

3 νέα / updated tests:

- **B2: supplier list χρησιμοποιεί reusable `SupplierCard`** με verified badge & star rating.
- **B2: supplier profile** έχει hero (avatar + verified + rating), 3-stat grid και loading states.
- **B2: supplier map — end-to-end**: schema (lat/lng nullable real), `mapSupplierRow` conditional include, mock coordinates ανά πόλη, seed fallback σε null, component με defensive `UIManager` check + `require`, integration στο profile με guard σε undefined coords.

Έλεγχοι: `pnpm check` καθαρό, `pnpm test` 39/39 passing.

### Pending για επόμενη συνεδρία

- Επαλήθευση end-to-end subscription flow στο iPhone μετά το clean build (`activate` / `cancel` / immediate downgrade path) — θα γίνει ταυτόχρονα με το επόμενο QA pass.
- Φάση 2 enforcements: S5.a monthly order counter, S5.b favorites cap (χρειάζεται νέο `favorites` table), S5.c history window filter.

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
