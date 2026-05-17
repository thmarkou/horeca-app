# Σχέδιο υλοποίησης — ένα app, δύο εμπειρίες (κατάστημα & supplier)

Στόχος: **ίδιο binary στο App Store**, με **διαφορετική πλοήγηση και λειτουργίες** ανά ρόλο (`buyer` = καταστηματάρχης, `supplier` = προμηθευτής), και **επαγγελματική αίσθηση** (σαφή ιεραρχία, συνέπεια, εμπιστοσύνη B2B).

---

## 1. Αρχές (γνώμονας)

| Αρχή | Σημαίνει |
|------|-----------|
| **Ρόλος από το backend** | Ο ρόλος να προέρχεται από authenticated session / API, όχι μόνο από AsyncStorage (το local demo role είναι προσωρινό). |
| **Χωριστά “κόσμοι” UI** | Buyer: ανακάλυψη, κατάλογοι, επανάληψη παραγγελιών. Supplier: εισερχόμενες παραγγελίες, κατάσταση, απόδοση — όχι ίδια tabs με κενό περιεχόμενο. |
| **Ίδιο design system** | Χρώματα, τυπογραφία, κάρτες, κουμπιά από κοινά components — ώστε να φαίνεται **μία σοβαρή εφαρμογή**, όχι δύο ενωμένα demos. |
| **Κεντρική ροή** | Μετά login/sign‑up, ο χρήστης καταλήγει στο **σωστό root** (buyer tabs vs supplier hub) χωρίς χειροκίνητα “Πίσω”. |

---

## 2. Τρέχουσα κατάσταση (σύντομα)

- **Ρόλος:** `HorecaAccountRole` (`buyer` \| `supplier`) σε `lib/horeca-stored-role.ts` + επιλογή στο sign‑up.
- **Πλοήγηση:** Supplier → `/(supplier-tabs)` (4 tabs), buyer → `/(tabs)` (5 tabs)· ρόλος από API + SecureStore.
- **Πλατφόρμα:** API + SQLite, `users.role` στο schema, endpoints καταλόγου/παραγγελιών.
- **Κενά:** supplier δεν έχει **δική του tab bar** εμπειρία· mixed English/ Greek σε supplier dashboard· guards “μόνο buyer” / “μόνο supplier” όχι πλήρεις· επαγγελματική polish ενιαία.

---

## 3. Στόχος εμπειρίας ανά ρόλο

### Buyer (κατάστημα)

- **Κεντρική ιδέα:** «Όλοι οι προμηθευτές σε μία ροή» — αναζήτηση, κατηγορίες, επανάληψη, παραγγελίες, λογαριασμός.
- **Tabs (ενδεικτικά):** Αρχική · Προμηθευτές · Παραγγελίες · Αγαπημένα · Λογαριασμός (ή παρόμοια, μετά από UX review).

### Supplier (προμηθευτής)

- **Κεντρική ιδέα:** «Τι χρειάζεται σήμερα» — νέες παραγγελίες, επεξεργασία, κατάσταση, απόδοση.
- **Tabs (ενδεικτικά):** Πίνακας · Παραγγελίες · Κατάλογος/Προϊόντα (όταν υπάρχει API) · Λογαριασμός (ή “Προφίλ επιχείρησης”).

---

## 4. UI/UX — “σοβαρή” B2B εφαρμογή

Χωρίς να αλλάξεις brand, εφάρμοσε:

1. **Σταθερή ιεραρχία:** τίτλος οθόνης → υπότιτλος/περιγραφή → περιεχόμενο · κενά (padding) προβλέψιμα.
2. **Κενές καταστάσεις:** skeleton ή empty state με **μία σαφή ενέργεια** (π.χ. «Δεν έχετε παραγγελίες ακόμη» + CTA).
3. **Καταστάσεις φόρτωσης/σφάλματος:** ίδια patterns σε buyer και supplier.
4. **Κείμενο:** ενιαία γλώσσα (π.χ. ελληγικά UI) + αποφυγή placeholder τύπου “Supplier dashboard” σε αγγλικά χωρίς λόγο.
5. **Προσβασιμότητα:** αρκετά μεγάκια hit targets, σαφή labels στα κουμπιά.

Χρησιμοποίησε υπάρχοντα: `ScreenContainer`, χρώματα από `useColors`, `IconSymbol` — επέκταση με **κοινές κάρτες** (π.χ. `SectionHeader`, `MetricCard`) όπου επαναλαμβάνεται.

---

## 5. Φάσεις υλοποίησης (βήμα βήμα)

### Φάση A — Πλοήγηση & ρόλος (shell)

**Στόχος:** Δύο ξεκάθαρα “roots” μετά το auth, χωρίς ασάφεια.

- [x] **A1.** Ορισμός **ρόλου από session** (API `user.role` σε login/register/me + SecureStore· AsyncStorage επωνυμίας ως legacy).
- [x] **A2.** **Buyer:** `app/(tabs)/_layout.tsx` — guard: αν `role === supplier` → `/(supplier-tabs)`.
- [x] **A3.** **Supplier:** `app/(supplier-tabs)/_layout.tsx` — 4 tabs (Πίνακας, Παραγγελίες, Κατάλογος, Λογαριασμός)· διαγράφηκαν `supplier-dashboard` / `supplier-orders` ως ξεχωριστά stack routes.
- [x] **A4.** `navigateAfterHorecaAuth` → `replace` σε `/(tabs)` ή `/(supplier-tabs)` μέσω `getSessionHorecaRole()`.
- [x] **A5.** Guards: supplier shell — χωρίς user → `welcome`· buyer στο shell → `(tabs)`· buyer tabs — supplier → `/(supplier-tabs)`.

**Παράδοση:** Login ως buyer → 5 tabs buyer. Login ως supplier → supplier tab bar, χωρίς orphan “Πίσω” από dashboard.

---

### Φάση B — Οθόνες buyer (πολιτισμός & αξία)

**Στόχος:** Να εμφανίζεται **συγκεντρωμένη αγορά** και **επαγγελματική αίσθηση**.

- [x] **B1.** Αρχική (`(tabs)/index`): time-aware χαιρετισμός + όνομα χρήστη, avatar initial, hero με σωστά CTAs (Νέα παραγγελία / Επανάληψη), γρήγορες ενέργειες (4), KPI strip από `recentOrders`, empty state χωρίς παραγγελίες, συνέπεια spacing/ιεραρχίας.
- [x] **B2.** Λίστα προμηθευτών / προφίλ προμηθευτή: `SupplierCard`, `StarRating`, verified/«Νέος», καρδιά αγαπημένων, επεκταμένο `supplier-profile` (hero, stats, προϊόντα, χάρτης όπου εφαρμόζεται).
- [x] **B2/B3.** Παραγγελίες buyer: φίλτρα Ενεργές/Ιστορικό/Όλες με counts, empty states ανά φίλτρο, κάρτες με Λεπτομέρειες/Επανάληψη (χωρίς nested touchable), δυναμικό `order-detail` που διαβάζει `id` από `useLocalSearchParams` και χρησιμοποιεί το ίδιο query cache με τη λίστα.
- [x] **B4.** Λογαριασμός buyer: avatar, όνομα/email/ρόλος από SecureStore, **`SubscriptionCard`** με πραγματικό plan από API + link στην οθόνη συνδρομής, έξοδος μέσω `Api.signOut()`. Καμία hardcoded demo επιχείρηση, καμία sign-in/sign-up CTA σε authenticated οθόνη, χωρίς supplier snapshot.

**Παράδοση:** Ροή buyer “demo‑ready” για demo σε πελάτη (χωρίς απαραίτητα νέα backend features).

---

### Φάση C — Οθόνες supplier (λειτουργική εφαρμογή)

**Στόχος:** Ο supplier να **δουλεύει** από το κινητό, όχι μόνο να βλέπει αριθμούς.

- [x] **C1.** Πίνακας: greeting + όνομα, hero προτεραιότητας όταν υπάρχουν νέες παραγγελίες, 2x2 metric tiles (Νέες / Σε επεξεργασία / Χαμηλό απόθεμα / Τζίρος), preview επόμενων παραδόσεων με status pills. Αφαιρέθηκε το “Supplier dashboard” ως τίτλος‑μόκο.
- [x] **C2.** Λίστα παραγγελιών supplier: φίλτρα (Νέες / Σε επεξεργασία / Καθ' οδόν / Ολοκληρωμένες / Όλες) με live counts, status pills ανά κάρτα, empty states ανά φίλτρο, horizontal scroll στα chips.
- [x] **C3.** Λεπτομέρεια παραγγελίας: shared `/order-detail` route που δέχεται `id` — δουλεύει και για supplier από το Dashboard & Orders preview. Στοιχεία επικοινωνίας buyer παραμένουν για Φάση E (όταν το API τα παρέχει).
- **C4.** Κατάλογος supplier — σε βήματα:
  - [x] **C4a.** Read-only list: νέο role-gated `GET /api/supplier/products` (εντοπίζει το storefront μέσω `suppliers.ownerUserId`), νέος hook `useSupplierOwnProductsQuery`, νέα οθόνη `(supplier-tabs)/catalog.tsx` με summary tiles (σύνολο + χαμηλό απόθεμα), κάρτες προϊόντων με availability pill (success/warning) και empty/loading/error states. Το API επιστρέφει και raw `availabilityStatus` ώστε το C4b να χτίσει toggle πάνω στο ίδιο payload.
  - [x] **C4b.** Toggle διαθεσιμότητας (immediate ↔ limited): role-gated + ownership-gated `PATCH /api/supplier/products/:id/availability` (επαληθεύει ότι το product ανήκει στο listing του authenticated supplier). Client mutation με **optimistic update** και rollback σε error· invalidate και των buyer-side queries (featuredProducts, productsBySupplier, product, operationalSummary) ώστε η αλλαγή να διαδοθεί παντού. UI: tappable availability pill με per-card busy state και spinner. CORS επεκτάθηκε με PATCH/DELETE (προετοιμασία για C4c).
  - [x] **C4c.** Full CRUD (create / edit / delete). Backend: νέα `POST /api/supplier/products`, `PATCH /api/supplier/products/:id`, `DELETE /api/supplier/products/:id` — όλα πίσω από κοινό `requireSupplierStorefront` helper (discriminated union για clean TS narrowing) με role + ownership gating. Shared Zod schema για create/update (name/category/unit/priceEur/description/availability) με price regex `/^\d+(\.\d{1,2})?$/`. Client: `useCreateSupplierProductMutation` (invalidate on success — χρειάζεται server id), `useUpdateSupplierProductMutation` και `useDeleteSupplierProductMutation` με **optimistic updates** + rollback, και κοινό `invalidateProductCaches` helper που συγχρονίζει τα buyer views. UI: νέα `app/supplier-product-form.tsx` οθόνη (create + edit modes, διαβάζει το existing product από το supplier cache), `KeyboardAvoidingView`, client-side validation (required fields, price regex με `,`→`.` normalization, max lengths), segmented control για availability, delete button με `Alert.alert` confirmation σε edit mode. Supplier catalog tab: «+ Νέο προϊόν» primary button + «Επεξεργασία» action σε κάθε κάρτα δίπλα στο availability toggle, και εμπλουτισμένο empty state CTA.

**Παράδοση:** Supplier μπορεί να χρησιμοποιήσει την εφαρμογή ως “κανονικό” εργαλείο ημέρας.

---

### Φάση D — Design system & επανάχρηση

**Στόχος:** Λιγότερο duplicate code, πιο “premium” look.

- [x] **D1.** Κοινά components σε `components/ui/`:
  - `StatusPill` — αντικατέστησε 5 inline pills (buyer+supplier orders, home, dashboard, detail).
  - `EmptyState` — αντικατέστησε 4 inline dashed cards.
  - `MetricTile` — βγήκε από local orisμό μέσα στον supplier dashboard σε shared.
  - `FilterTabs` — generic `<K extends string>`, καλύπτει 3 buyer + 5 supplier filters με scrollable flag.
  Κάθε ένα έχει regression test που απαγορεύει inline αναδημιουργία. Καθάρισε ~115 γραμμές duplicated JSX.
- [x] **D2.** Audit & κανονικοποίηση radii: 5 outliers `rounded-[22px]` → `rounded-[24px]` (cart, favorites, suppliers). Το app πλέον χρησιμοποιεί μόνο canonical radii (20/24/28 + 2xl για inputs + full για pills/buttons). Test που πιάνει future drift.
- [x] **D3.** Onboarding (`app/welcome.tsx`): hero με σαφές value prop (δύο κόσμοι σε ένα app) + **δύο role-aware κάρτες** («Για καταστήματα» / «Για προμηθευτές»), κάθε μία με εικονίδιο, tagline και 3 concrete benefits — όχι generic marketing copy. Τα CTAs παραμένουν τρία (Sign-up / Sign-in / Demo preview) σε sticky footer. Το `app/index.tsx` πλέον στέλνει authenticated χρήστες κατευθείαν στο σωστό root μέσω `navigateAfterHorecaAuth`, οπότε το onboarding εμφανίζεται μόνο πριν το sign-in. Regression tests πιάνουν future regressions στο copy και στη δρομολόγηση.

---

### Φάση E — Backend & ασφάλεια (όταν το προϊόν το απαιτεί)

- [x] **E1.** `/api/orders/recent` role-aware: buyer → orders where `buyerId = userId`· supplier → orders where `supplierId = <listing owned by userId>`. Απαντά πλέον και με `counterpartyName` (ο άλλος ρόλος από τη σκοπιά του χρήστη).
- [x] **E2.** `suppliers.ownerUserId` (ήδη στο schema) χρησιμοποιείται για να ενώσει τον supplier user με το storefront του· seed βάζει τον `supplier@horeca.demo` ως owner του "Aegean Coffee Trade".
- [ ] **E3. Παρκαρισμένο μέχρι αποφάσεις υποδομής.** Rate limiting, HTTPS παραγωγής, μυστικά εκτός repo. Εξαρτάται από την επιλογή hosting (Fly.io / Railway / Cloudflare Workers / άλλο) και domain, οπότε το κάνουμε όταν πλησιάσουμε σε TestFlight/App Store deployment. Μέχρι τότε ο server τρέχει μόνο σε dev LAN.

---

## 6. Σειρά εκτέλεσης (συνοπτικά)

1. **Φάση A** (πλοήγηση + ρόλος) — πρώτα, για να μην χτίζεις UI πάνω σε λάθος shell.  
2. **Παράλληλα λεπτά:** κείμενα supplier στα ελληγικά + αφαίρεση αγγλικών τίτλων.  
3. **Φάση B** και **C** εναλλάξ ή ανά sprint (buyer demo vs supplier demo).  
4. **D** συνεχώς όταν επαναλαμβάνεται pattern.  
5. **E** πριν πραγματικούς πελάτες εκτός dev.

---

## 7. Ορισμός επιτυχίας (MVP dual‑role)

- [x] Δύο λογαριασμοί demo (buyer + supplier) με **διακριτή εμπειρία** χωρίς σύγχυση.
- [x] Κενές καταστάσεις και λάθη χειρισμένα αξιοπρεπώς (shared patterns σε buyer/supplier).
- [ ] Χωρίς αχρείαστα αγγλικά στο κύριο UI — περιορισμένα residuals (audit όταν χρειαστεί).
- [x] Εγχειρίδιο testers: [`docs/TESTING_GUIDE.md`](TESTING_GUIDE.md).

---

## 8. Φάση S — Subscription (buyer-funded, 2 tiers)

**Επιχειρηματική απόφαση που πάρθηκε:** Μοντέλο **A (buyer-funded SaaS)** με **2 tiers** (Δωρεάν + Pro). Pricing anchor: **€9,90 / μήνα** ή **€89 / έτος** (-25%). Mock-first billing flow — όταν φτάσουμε TestFlight αντικαθίσταται με RevenueCat + StoreKit (15% Apple Small Business Program). Ο client contract παραμένει σταθερός.

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

### Φάσεις

- [x] **S1. Backend.** Νέο `subscriptions` table (1-to-1 με user, cascade delete, plan/status/renewsAt/canceledAt/trialEndsAt). `GET /api/me/subscription` (lazy auto-create) + dev-only `POST /api/dev/subscription/{activate,cancel}` πίσω από `assertDevEnv` guard (`NODE_ENV !== "production"`). Auto-enrolment σε `free` στο `/api/auth/register`. Seed περιλαμβάνει subscription rows για demo accounts.
- [x] **S2. Client foundation** (`lib/subscription.ts`). `Subscription` type, `useSubscriptionQuery` με 401/403 fallback σε `DEFAULT_FREE_SUBSCRIPTION` (κανένα null check στο UI), `useFeatures()` helper, πλήρες `FeatureSet` matrix, `PLAN_CATALOG` με τιμές & bullets, `useActivateProMutation`, `useCancelSubscriptionMutation`.
- [x] **S3. UI.** Νέα `app/subscription.tsx` (current plan card, billing cycle toggle monthly/yearly, plan comparison cards με «Τρέχον»/«Προτεινόμενο» badges, upgrade CTA, destructive cancel με Alert.alert, legal fine print για mock flow). Το buyer `account.tsx` αντικατέστησε το «Δωρεάν demo» placeholder με πραγματικό `SubscriptionCard` που διαβάζει το real plan και linkάρει στην οθόνη.
- [x] **S4. Pilot gating.** Reusable `<GatedAction>` component (single decision point: features flag → callback ή paywall redirect σε `/subscription` με Alert). Pilot στο buyer orders tab («Εξαγωγή ιστορικού», `canExportHistory`). Lock badge + a11y label «(απαιτεί Pro)» μόνο όταν locked.
- [x] **S5. Enforcement — μεγαλύτερο μέρος για demo:**
  - [x] Monthly order counter (`GET /api/me/orders/usage`, 402 στο checkout, badge στο Παραγγελίες).
  - [x] Favorites server-side + cap 3 (free), paywall / 402 στο 4ο.
  - [x] Ιστορικό 30 ημερών για free (`partitionOrdersByHistoryWindow` + paywall row)· Pro πλήρες.
  - [x] Multi-location & invites: ροές `app/locations/*`, picker σε Home/Orders/Checkout, gates από `FeatureSet`.
- [ ] **S5 leftovers (μετά το demo):**
  - [ ] **Price alerts** (CRUD UI + worker)· εξαρτάται από προτεραιότητα προϊόντος.
  - [ ] **canCompareCosts** επιπλέον polish αν θέλετε διακριτά paywalls πέρα από τα Έξοδα.
- [ ] **S6. Πραγματικό billing.** RevenueCat integration πριν TestFlight: `react-native-purchases` SDK, products config στο App Store Connect (monthly + yearly pro), webhook → `POST /api/webhooks/revenuecat` που ενημερώνει το `subscriptions` table. Τα dev endpoints απενεργοποιούνται αυτόματα από το production env guard.

**Παράδοση τώρα:** Demo-ready upgrade flow. Buyer βλέπει πραγματικό plan badge, ανοίγει την οθόνη συνδρομής, αναβαθμίζει σε Pro (mock), τα κλειδωμένα features ξεκλειδώνουν χωρίς restart.

---

*Τελευταία ενημέρωση: Μάιος 2026 — B2 και βασικά S5 enforcement ευθυγραμμίστηκαν με την τρέχουσα υλοποίηση.*
