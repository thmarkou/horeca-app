# Ανοικτές εργασίες μέχρι την ολοκλήρωση

Τι έχει μείνει πριν το Horeca Source χαρακτηριστεί "ολοκληρωμένο" (MVP dual-role, demo-ready, έτοιμο για TestFlight → App Store).

Οι εργασίες είναι ομαδοποιημένες σε **4 φάσεις** με αύξουσα δέσμευση χρόνου:

1. **Demo-ready MVP** — τι λείπει για να κλείσει το κύκλωμα buyer/supplier και να μπορεί να γίνει demo σε πελάτη.
2. **Ενίσχυση Pro value prop (S5 enforcements)** — ώστε το €9,90/μήνα να έχει ορατή αξία.
3. **Νέες λειτουργίες** — απαιτούν ξεχωριστές οθόνες που δεν υπάρχουν σήμερα.
4. **Πριν το store (TestFlight / App Store)** — πραγματικό billing + υποδομή.

Κάθε εργασία έχει: στόχο, περιγραφή, αρχεία/endpoints που επηρεάζονται, εκτιμώμενο scope, εξαρτήσεις.

---

## Φάση 1 — Demo-ready MVP

Αυτά είναι τα τελευταία κενά για να μπορεί το app να παρουσιαστεί πειστικά σε πελάτη/επενδυτή.

### 1.1 · `B2` Λίστα & προφίλ προμηθευτή (buyer)

**Στόχος.** Ο buyer να ανοίγει τη λίστα προμηθευτών και το προφίλ μεμονωμένου προμηθευτή και να αισθάνεται ότι βλέπει «σοβαρή» B2B εφαρμογή, ισάξια με τις υπόλοιπες οθόνες της Φάσης B.

**Τι υπάρχει σήμερα.** Η λίστα δουλεύει λειτουργικά (αφού μπήκαν τα ενεργά filter chips), αλλά οι κάρτες και το προφίλ μέσα είναι ακόμα «βασικά».

**Τι χρειάζεται.**

- **Supplier card στη λίστα:**
  - Verified badge (pill με «✓ Εξακριβωμένος») όταν `verified === true`.
  - Rating σε stars (★★★★☆ 4.8/5) αντί για σκέτο «4.8».
  - Κατηγορία + τοποθεσία σε υπότιτλο, delivery time + minimum order σε metadata row.
  - Highlight phrase (π.χ. «Ελληνικός καφές από 1970») σαν tagline.
  - CTAs: «Άνοιγμα καταλόγου» (primary) + «Αποθήκευση» (αγαπημένο, αν δεν υπάρχει ήδη).
- **Supplier profile (`app/supplier-profile.tsx`):**
  - Hero με όνομα, κατηγορία, rating, verified badge, highlight.
  - Stats row: χρόνια συνεργασίας / παραδόσεις / rating.
  - Sections: «Προϊόντα» (grid από `useProductsBySupplierQuery`), «Πολιτική παράδοσης» (static text από supplier record), «Επικοινωνία» (placeholder μέχρι E3).
  - Empty/loading/error states ομοιόμορφα με τα υπόλοιπα screens.
  - CTA footer: «Ξεκίνα παραγγελία» → `/catalog?supplierId=…`.

**Αρχεία που επηρεάζονται.**

- `app/(tabs)/suppliers.tsx` (card upgrades)
- `app/supplier-profile.tsx` (hero + sections)
- Πιθανό νέο component `components/ui/supplier-card.tsx` αν η κάρτα χρησιμοποιηθεί και αλλού

**Εκτιμώμενο scope.** 1–2 ώρες. Καθαρά UI, δεν απαιτεί backend αλλαγές.

**Εξαρτήσεις.** Καμία.

---

### 1.2 · Εγχειρίδιο testers (1 σελίδα)

**Στόχος.** Όταν δώσεις το app σε κάποιον να δοκιμάσει (πελάτη, συνεργάτη, beta tester), να έχει **ένα μόνο αρχείο** που εξηγεί τα πάντα — χωρίς να ρωτήσει «πώς μπαίνω;».

**Τι χρειάζεται (νέο αρχείο `docs/TESTING_GUIDE.md`):**

1. **Πρόσβαση**
   - URL από TestFlight / QR code (μελλοντικά).
   - Demo credentials: `buyer@horeca.demo / demo1234`, `supplier@horeca.demo / demo1234`.
   - Πώς αλλάζεις ρόλο (sign out → sign in με τον άλλο λογαριασμό).

2. **Σενάρια δοκιμής buyer** (checklist μορφής):
   - [ ] Login → βλέπεις 5 tabs (Αρχική, Προμηθευτές, Παραγγελίες, Αγαπημένα, Λογαριασμός).
   - [ ] Αρχική: χαιρετισμός, γρήγορες ενέργειες, KPI strip, πρόσφατες παραγγελίες.
   - [ ] Προμηθευτές → filter chips → «Καφές» → λίστα.
   - [ ] Άνοιγμα καταλόγου → προϊόν → προσθήκη στο καλάθι → checkout (mock).
   - [ ] Λογαριασμός → Συνδρομή → Αναβάθμιση σε Pro → export ξεκλειδώνεται.

3. **Σενάρια δοκιμής supplier:**
   - [ ] Login → 4 tabs (Πίνακας, Παραγγελίες, Κατάλογος, Λογαριασμός).
   - [ ] Κατάλογος → «+ Νέο προϊόν» → validation errors → αποθήκευση.
   - [ ] Κατάλογος → Επεξεργασία προϊόντος → αλλαγή τιμής → αποθήκευση.
   - [ ] Toggle availability → ενημερώνεται αμέσως.
   - [ ] Παραγγελίες → φίλτρα → άνοιγμα παραγγελίας.

4. **Πώς αναφέρεις bug.**
   - GitHub Issues link ή email.
   - Τι να συμπεριλάβει: screenshot, βήματα, iOS version, συσκευή.

5. **Γνωστά όρια του demo.**
   - Η αναβάθμιση συνδρομής είναι προσομοίωση (όχι πραγματική χρέωση).
   - Το backend τρέχει σε dev server, μπορεί να πέσει.
   - Δεν υπάρχουν ακόμη push notifications.

**Αρχεία που επηρεάζονται.** Μόνο `docs/TESTING_GUIDE.md` (νέο).

**Εκτιμώμενο scope.** 30 λεπτά.

**Εξαρτήσεις.** Όταν έχουν κλείσει τα άλλα demo-ready items για να μη χρειαστεί ξαναγράψιμο.

---

### 1.3 · Επαλήθευση συνδρομής end-to-end στο iPhone

**Στόχος.** Να επιβεβαιωθεί ότι η ροή της Φάσης S (Συνδρομή) λειτουργεί σε φυσική συσκευή μετά από clean Xcode build.

**Τι δεν δούλεψε σε προηγούμενο session.** Το JS bundle του Xcode build δεν φορτώθηκε σωστά — ο χρήστης έβλεπε παλιό state, παρότι είχαν γίνει commit + push τα αρχεία. Πιθανή αιτία: Metro σε μη-default port (8091), embedded bundle stale. Χρειάζεται **Clean Build Folder → Run** για να περιληφθεί το τρέχον JS.

**Checklist επαλήθευσης.**

- [ ] Xcode → **Product → Clean Build Folder** (`Shift+Cmd+K`).
- [ ] **Product → Run** (`Cmd+R`).
- [ ] Login ως buyer.
- [ ] Λογαριασμός → «Συνδρομή» badge δείχνει **«Δωρεάν»** (όχι πλέον «Δωρεάν demo»).
- [ ] Πάτημα «Δες τα πλάνα» → ανοίγει `/subscription`.
- [ ] Plan comparison cards, billing cycle toggle, Pro «Προτεινόμενο» badge φαίνονται.
- [ ] «Αναβάθμιση — €9,90 / μήνα» → γίνεται Pro, το Pro card έχει «Τρέχον» badge.
- [ ] Πίσω στον Λογαριασμό → badge πλέον «Pro».
- [ ] Στο tab Παραγγελίες → «Εξαγωγή ιστορικού» **δεν** έχει «Pro» lock badge.
- [ ] Επιστροφή στη Συνδρομή → **«Demo: επιστροφή σε Δωρεάν άμεσα»** κίτρινο button είναι ορατό.
- [ ] Πάτημα → alert επιβεβαίωσης → confirm → γίνεσαι Free άμεσα.
- [ ] Tab Παραγγελίες → «Εξαγωγή ιστορικού» ξανά κλειδωμένο με lock badge.
- [ ] Tap του locked button → alert «Διαθέσιμο με Pro» με CTA «Δες τα πλάνα».

**Αρχεία που επηρεάζονται.** Κανένα — validation μόνο.

**Εκτιμώμενο scope.** 10 λεπτά αν όλα παίζουν, 30–60 λεπτά αν προκύψει regression.

**Εξαρτήσεις.** Μόνο clean Xcode build.

---

## Φάση 2 — Ενίσχυση Pro value prop (S5 enforcements)

Τα κλειδωμένα features του Pro tier που είναι **ήδη δηλωμένα** στο `FeatureSet` αλλά **δεν είναι ακόμη ενεργά enforced** σε καμία οθόνη/backend path. Η σειρά βασίζεται σε impact-for-effort — ξεκινάμε από αυτά με τη μεγαλύτερη conversion pressure.

### 2.1 · `S5.a` Monthly order counter (10/μήνα για free)

**Στόχος.** Ο free buyer να βλέπει καθαρά πόσες παραγγελίες έχει κάνει αυτόν τον μήνα και να χτυπήσει σε paywall στην 11η. Αυτό είναι το πιο ορατό Pro benefit στο demo — ο user αισθάνεται το όριο.

**Backend (`platform/app.ts`).**

- Νέο helper `countUserOrdersThisMonth(userId: number): Promise<number>`:
  ```ts
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.buyerId, userId), gte(orders.createdAt, startOfMonth)));
  return Number(c ?? 0);
  ```
- Στο `POST /api/orders` (όταν δημιουργηθεί), πριν το insert:
  - Αν `isPro === false` (reading από το subscription row) **και** `countUserOrdersThisMonth(userId) >= 10` → επιστρέφουμε `402 Payment Required` με `{ error: "monthly_limit_reached", limit: 10 }`.
- Νέο endpoint `GET /api/me/orders/usage` → `{ used: N, limit: 10, resetsAt: ISO }` για το UI badge.

**Client (`lib/horeca-queries.ts` + `lib/subscription.ts`).**

- Νέος hook `useMonthlyOrderUsageQuery()` που χτυπά το `/api/me/orders/usage`.
- Στο `useCreateOrderMutation`, αν το response είναι 402 με `monthly_limit_reached`, ανοίγουμε paywall Alert με CTA «Αναβάθμισε σε Pro» → `/subscription`.

**UI (`app/(tabs)/orders.tsx`).**

- Νέο badge στην κορυφή του tab: **«X / 10 παραγγελίες αυτόν τον μήνα»** (ή **«Απεριόριστες»** αν Pro).
- Όταν `X >= 8` (80% του ορίου), το badge γίνεται warning color με μικρό text «Κοντά στο όριο».
- Όταν `X === 10`, inline info card «Έφτασες στο όριο. Αναβάθμισε σε Pro για απεριόριστες παραγγελίες» με CTA.

**Αρχεία που επηρεάζονται.**

- `platform/app.ts` (+15 γραμμές)
- `lib/horeca-queries.ts` (+1 hook)
- `app/(tabs)/orders.tsx` (+10 γραμμές)
- Ενδεχομένως `app/checkout.tsx` αν πιάνουμε το 402 και εκεί

**Εκτιμώμενο scope.** 2–3 ώρες.

**Εξαρτήσεις.** Η Φάση S είναι ήδη σε place.

---

### 2.2 · `S5.b` Favorites cap (3 για free)

**Στόχος.** Free user βλέπει cap 3 στα αγαπημένα, paywall στο 4ο.

**Τι υπάρχει σήμερα.** Το tab «Αγαπημένα» υπάρχει αλλά δεν έχει backend cap — δεν υπάρχει καν favorites table ακόμη (τα αγαπημένα είναι τοπικό AsyncStorage state).

**Απαιτήσεις.**

1. Backend migration για favorites:
   - Νέο table `favorites` (`userId`, `supplierId`, `createdAt`, unique(userId, supplierId), cascade delete).
   - `GET /api/me/favorites` → list
   - `POST /api/me/favorites` → add (επιστρέφει 402 αν free και ήδη έχει 3)
   - `DELETE /api/me/favorites/:supplierId` → remove
2. Client:
   - `useFavoritesQuery`, `useAddFavoriteMutation`, `useRemoveFavoriteMutation`.
   - Optimistic updates.
3. UI:
   - Στην κάρτα προμηθευτή, heart icon toggle. Όταν free & ήδη 3 → `GatedAction` paywall.
   - Badge «X / 3 αγαπημένα» για free, «X αγαπημένα» για Pro.

**Αρχεία που επηρεάζονται.**

- `platform/db/schema.ts` (+1 table)
- `platform/app.ts` (+3 endpoints)
- `lib/horeca-queries.ts` (+3 hooks)
- `app/(tabs)/favorites.tsx` (UI)
- `app/(tabs)/suppliers.tsx` (heart toggle στην κάρτα)

**Εκτιμώμενο scope.** 3–4 ώρες.

**Εξαρτήσεις.** Η Φάση S είναι ήδη σε place. Θέλει πρώτα το favorites feature να μπει ουσιαστικά (τώρα είναι ψευδο-state).

---

### 2.3 · `S5.c` History window filter (30 μέρες για free)

**Στόχος.** Free user βλέπει μόνο τις τελευταίες 30 ημέρες παραγγελιών. Οι παλαιότερες κρύβονται με «paywall row» στο τέλος της λίστας.

**Απαιτήσεις.**

1. Client-side filter στο `recentOrders` query με το `historyWindowDays` από `useFeatures()`.
2. Αν `historyWindowDays === Infinity` → δείχνουμε όλες.
3. Αν `< Infinity` και υπάρχουν παλαιότερες παραγγελίες που κόπηκαν:
   - Inline card στο τέλος της λίστας: «+N παλαιότερες παραγγελίες. Ξεκλείδωσε πλήρες ιστορικό με Pro.» + `GatedAction`.

**Αρχεία που επηρεάζονται.**

- `app/(tabs)/orders.tsx` (filter logic + paywall row)
- Πιθανώς `app/order-detail.tsx` αν πατήσει παλιά παραγγελία από URL που ξέρει

**Εκτιμώμενο scope.** 1 ώρα.

**Εξαρτήσεις.** Η Φάση S είναι ήδη σε place.

---

## Φάση 3 — Νέες λειτουργίες (νέες οθόνες)

Αυτά είναι **επιχειρηματικά features** που προαναγγέλθηκαν στο gating matrix αλλά δεν υπάρχει καν η οθόνη τους σήμερα. Δεν έχει νόημα να τα gate-άρουμε πριν χτιστούν.

### 3.1 · `S5.d` Multi-location & team seats

**Στόχος.** Ο user να μπορεί να διαχειριστεί >1 κατάστημα και >1 χρήστη ανά κατάστημα (μέχρι 5 για το Pro).

**Απαιτήσεις.**

- **Data model**: Νέο `locations` table (`userId`, `name`, `address`), νέο `location_members` table (`locationId`, `userId`, `role`), προσαρμογή `orders` ώστε να κρατά `locationId`.
- **Endpoints**: CRUD για locations, προσκλήσεις members (via email), αποδοχή/απόρριψη.
- **UI**:
  - Νέα οθόνη `app/locations/index.tsx` (λίστα), `app/locations/[id].tsx` (detail + team), `app/locations/new.tsx` (create).
  - Επιλογέας «Active location» στη Home (αν έχεις >1).
  - Invite flow: email → pending invite → email link → accept στο app.
- **Gating**: Στη δημιουργία 2ης location (ή 2ου member) για free → paywall.

**Αρχεία που επηρεάζονται.**

- `platform/db/schema.ts`
- `platform/app.ts` (σημαντικές προσθήκες)
- `lib/horeca-queries.ts`
- Νέες 3–4 οθόνες
- Refactor σε παραγγελίες για να φιλτράρουν ανά active location

**Εκτιμώμενο scope.** 2–3 μέρες. Είναι το πιο μεγάλο feature.

**Εξαρτήσεις.** Email sending infrastructure (SendGrid / Resend / SMTP). Το S6 (RevenueCat) **όχι** αναγκαίο — δουλεύει με mock billing.

---

### 3.2 · `S5.e` Price alerts

**Στόχος.** Ο buyer να ορίζει «Ειδοποίησέ με αν το [προϊόν] πέσει κάτω από [τιμή]».

**Απαιτήσεις.**

- **Data model**: `price_alerts` table (`userId`, `productId`, `threshold`, `active`, `createdAt`).
- **Endpoints**: CRUD.
- **Worker**: Cron/interval που ελέγχει τιμές προϊόντων και στέλνει push notification (ή email) όταν threshold hit. **Απαιτεί push notification infrastructure**.
- **UI**:
  - Στο product detail, button «Ειδοποίησέ με» → modal με price picker → save.
  - Νέα οθόνη `app/price-alerts.tsx` (λίστα alerts, edit, delete).

**Αρχεία που επηρεάζονται.** Νέα οθόνη, νέο backend component (worker), schema changes, push notification setup.

**Εκτιμώμενο scope.** 2–3 μέρες, εκ των οποίων 1 μέρα για push notifications (APNs cert, expo-notifications config, token registration).

**Εξαρτήσεις.** Push notifications infrastructure (Apple Push Notification service).

---

### 3.3 · `S5.e` Συγκριτικά κόστους (cost comparison)

**Στόχος.** Ο buyer βλέπει πόσο ξόδεψε σε προηγούμενους μήνες/έτη, ανά κατηγορία, ανά προμηθευτή — για να κάνει budgeting.

**Απαιτήσεις.**

- **Endpoint**: `GET /api/me/spending?groupBy=month|category|supplier&range=...` που επιστρέφει aggregated sums.
- **UI**: Νέα οθόνη `app/spending.tsx` με:
  - Line chart «Έξοδα ανά μήνα».
  - Pie/bar chart «Ανά κατηγορία».
  - Top 5 προμηθευτές με μεγαλύτερο όγκο.
  - CSV export (gated, canExportHistory).
- Επιλογές range (3μηνο / 6μηνο / έτος).

**Library για charts.** `react-native-gifted-charts` ή `victory-native`. Επιλέγουμε το πιο ελαφρύ που δεν μπλέκει με το build pipeline του Xcode.

**Αρχεία που επηρεάζονται.**

- `platform/app.ts` (+1 endpoint)
- Νέα οθόνη `app/spending.tsx`
- `package.json` (+charting lib)
- Νέος hook `useSpendingQuery`

**Εκτιμώμενο scope.** 1–1,5 μέρα.

**Εξαρτήσεις.** Καμία στο data layer (τα δεδομένα υπάρχουν). Επιλογή charting lib.

---

## Φάση 4 — Πριν το store (TestFlight / App Store)

### 4.1 · `S6` Πραγματικό billing — RevenueCat + StoreKit

**Στόχος.** Αντικατάσταση του mock billing με πραγματικές Apple subscriptions μέσω RevenueCat. Ο client contract (`GET /api/me/subscription`) παραμένει ίδιος, αλλά η πηγή αλήθειας μετακινείται από το dev endpoint στα webhooks του RevenueCat.

**Βήματα υλοποίησης.**

1. **Apple Developer Program** ($99/έτος) — αν δεν υπάρχει ήδη.
2. **App Store Connect**:
   - Δημιουργία app record.
   - Subscription group «Pro».
   - Products: `pro_monthly` (€9,90) + `pro_yearly` (€89).
   - Localized copy (Ελληνικά + Αγγλικά).
   - Screenshots, description, review notes.
3. **RevenueCat**:
   - Σύνδεση App Store credentials.
   - Mapping products → entitlement «pro».
   - Offerings config (monthly + yearly).
   - Webhook URL → `https://api.horeca-source.gr/api/webhooks/revenuecat` (θέλει E3 πρώτα).
4. **Client integration**:
   - Εγκατάσταση `react-native-purchases`.
   - `Purchases.configure(apiKey, userId)` στο app init με logged-in userId.
   - `useActivateProMutation` → `Purchases.purchasePackage(pkg)` αντί για direct fetch.
   - Restore purchases button στο subscription screen.
5. **Backend webhook** (`platform/app.ts`):
   - `POST /api/webhooks/revenuecat` με HMAC signature verification.
   - Mapping events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION` → update `subscriptions` table.
6. **Cleanup**:
   - Τα `/api/dev/subscription/{activate,cancel}` παραμένουν αλλά `assertDevEnv` τα κλείνει σε production.
   - «Demo: επιστροφή σε Δωρεάν άμεσα» button αφαιρείται (ή κρύβεται πίσω από `__DEV__`).
7. **Sandbox testing** με Apple sandbox accounts.

**Αρχεία που επηρεάζονται.**

- `package.json` (+`react-native-purchases`)
- `app/_layout.tsx` (configure RevenueCat)
- `app/subscription.tsx` (`Purchases.purchasePackage`, restore button)
- `lib/subscription.ts` (mutation updates)
- `platform/app.ts` (webhook endpoint)
- `platform/db/schema.ts` (ίσως προσθήκες για `revenuecatUserId`, `platform_subscription_id`)

**Εκτιμώμενο scope.** 1–2 μέρες + sandbox testing.

**Εξαρτήσεις.** Apple Developer Program + App Store Connect setup. E3 (HTTPS domain) για το webhook URL.

---

### 4.2 · `E3` Rate limiting, HTTPS, secrets & hosting

**Στόχος.** Ασφαλής παραγωγή. Αυτή τη στιγμή ο server τρέχει σε LAN χωρίς HTTPS, τα secrets είναι στο `.env.horecaapp` (gitignored αλλά στον τοπικό δίσκο), και δεν υπάρχει rate limiting.

#### 4.2.1 Επιλογή hosting

| Provider | Μηνιαίο κόστος | Setup time | Δυνατά σημεία | Αδυναμίες |
|---|---|---|---|---|
| **Fly.io** | ~$5 VM + $3 volume | ~1 ώρα | Persistent volume για SQLite, εύκολο Hono/Node | Manual scaling |
| **Railway** | ~$5 starter | ~30 λεπτά | Auto-deploy από GitHub, managed Postgres προαιρετικά | Κλειστό ecosystem |
| **Cloudflare Workers + D1** | Δωρεάν ≤100k req/day | ~3 ώρες | Δωρεάν, edge performance | Απαιτεί migration σε D1 (SQLite-compatible) |

**Πρόταση: Fly.io.** Κρατάει τον κώδικα 1:1, SQLite μένει, persistent volume φτιάχνεται με 2 εντολές. Για migration σε managed Postgres αργότερα (όταν σκαλώσουμε), αλλάζει μόνο `DATABASE_URL`.

#### 4.2.2 HTTPS + domain

- Αγορά domain (π.χ. `horeca-source.gr`, ~€12/έτος).
- DNS A record → Fly app IP.
- Certificate από Fly auto-provisioning (Let's Encrypt).
- `EXPO_PUBLIC_API_BASE_URL=https://api.horeca-source.gr` στο production build.

#### 4.2.3 Secrets management

- Μεταφορά `JWT_SECRET`, `DATABASE_URL` (αν κάνουμε Postgres migration), `REVENUECAT_WEBHOOK_SECRET` σε `fly secrets set …`.
- Rotation policy: JWT_SECRET rotation κάθε 90 ημέρες — απαιτεί token versioning.
- Το `.env.horecaapp` μένει μόνο για local dev, προστατεύεται από `.gitignore` (ήδη).

#### 4.2.4 Rate limiting

- **Library**: `hono-rate-limiter` ή χειροκίνητο in-memory (LRU) counter.
- **Κανόνες**:
  - `/api/auth/login` + `/api/auth/register`: 10 attempts / IP / 15 λεπτά.
  - `/api/**` authenticated: 120 req / user / λεπτό.
  - `/api/catalog/**` public: 60 req / IP / λεπτό.
- Response 429 με `Retry-After` header.

#### 4.2.5 CORS hardening

- Production allowlist: μόνο το app bundle ID + custom URL schemes (για deep links).
- Αφαίρεση του wildcard που χρησιμοποιείται σε dev.

#### 4.2.6 Observability

- Health check endpoint (`/health`) — ήδη υπάρχει.
- Logging σε structured JSON με request ID.
- Fly.io built-in metrics + logs tail για dev debugging.
- Προαιρετικό: Sentry integration για client + server errors.

#### 4.2.7 Backups

- Αν SQLite: automated volume snapshots στο Fly (daily, 7-day retention).
- Αν Postgres: managed backups από τον provider.
- Manual disaster recovery playbook (how to restore, tested once).

**Αρχεία που επηρεάζονται / νέα.**

- `fly.toml` (νέο)
- `Dockerfile` (νέο — multi-stage build για platform)
- `platform/middleware/rate-limit.ts` (νέο)
- `platform/app.ts` (CORS update)
- `docs/DEPLOYMENT.md` (νέο — runbook)

**Εκτιμώμενο scope.** 1 απόγευμα (3–4 ώρες) για Fly.io setup + rate limiting + CORS. Επιπλέον 1 ώρα για domain + DNS propagation wait.

**Εξαρτήσεις.** Αγορά domain. Fly.io account. Τα υπόλοιπα είναι κώδικας.

---

## Επιλογή προτεραιοτήτων

**Αν θες να φτάσεις σε demo-ready ASAP** (1 sprint ~5 μέρες):

1. Φάση 1.1 (B2 buyer polish) — 1–2h
2. Φάση 1.3 (verify subscription στο device) — 10min + fixes
3. Φάση 2.1 (monthly order counter) — 2–3h · **highest impact**
4. Φάση 2.3 (history window filter) — 1h
5. Φάση 1.2 (testing guide) — 30min

**Αν στόχος είναι App Store πριν το καλοκαίρι** (~1 μήνας):

- Παραπάνω + Φάση 4.2 (E3) + Φάση 4.1 (S6) + 1–2 από τις νέες λειτουργίες (προτείνω cost comparison — δείχνει ωραία σε demo).

**Αν ο χρόνος είναι ακόμα πιο ελεύθερος**: όλα τα παραπάνω.

---

*Ενημερώθηκε: 17/4/2026 — μετά την ολοκλήρωση της Φάσης S (Subscription).*
