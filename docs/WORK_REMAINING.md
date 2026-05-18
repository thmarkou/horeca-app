# Ανοικτές εργασίες μέχρι την ολοκλήρωση

Τι έχει μείνει πριν το Horeca Source χαρακτηριστεί "ολοκληρωμένο" (MVP dual-role, demo-ready, έτοιμο για TestFlight → App Store).

Οι εργασίες ήταν αρχικά ομαδοποιημένες σε **4 φάσεις** με αύξουσα δέσμευση χρόνου. **Για το demo setup (τοπικό + Xcode) οι Φάσεις 1–2 και τα 3.1/3.3 θεωρούνται κλειστά στην πράξη·** τα παρακάτω blocks διατηρούνται για αρχείο.

1. ~~**Demo-ready MVP**~~ ✅ (B2 polish, testers guide, προαιρετικό device checklist §1.3).
2. ~~**S5 enforcement (μεγαλύτερο μέρος)**~~ ✅ (όριο παραγγελιών, favorites, ιστορικό 30 ημ., τοποθεσίες + invites).
3. **Νέες λειτουργίες** — μένει επέκταση **παραγωγής** για price alerts/push ή **μεγαλύτερα όρια** εξαγωγής αν χρειαστεί.
4. **Πριν το store (TestFlight / App Store)** — **Φάση 4**: S6 + E3.

### Πίνακας κατάστασης demo (Μάιος 2026)

| Ενότητα στο doc | Κατάσταση | Σύντομη υλοποίηση |
|-----------------|-----------|-------------------|
| 1.1 B2 suppliers | ✅ | `components/ui/supplier-card.tsx`, `app/supplier-profile.tsx`, `(tabs)/suppliers` |
| 1.2 Testers guide | ✅ | [`docs/TESTING_GUIDE.md`](TESTING_GUIDE.md) |
| 1.3 Subscription στο device | ⏳ hand-test | [`TESTING_GUIDE.md`](TESTING_GUIDE.md) · ενότητα **«Τι πρέπει να κάνεις εσύ»** → υποενότητα **Β** |
| 2.1 Monthly orders cap | ✅ | `GET /api/me/orders/usage`, `(tabs)/orders`, `checkout.tsx` |
| 2.2 Favorites server + cap | ✅ | `platform` favorites API, `FavoriteSupplierHeart` |
| 2.3 History window | ✅ | `partitionOrdersByHistoryWindow`, `order-detail.tsx` gated |
| 3.1 Multi-location | ✅ | `app/locations/*`, `useBuyerActiveLocationPicker`, gates από `FeatureSet` |
| 3.3 Έξοδα / spending | ✅ | `app/spending.tsx`, `GET /api/me/spending` |
| 3.2 Price alerts | ✅ demo | `app/product-detail`, `price-alerts`, API + server evaluate interval· για **production** διαμορφώνεις Expo push / SMTP |
| 4 Store / infra | 🔲 | S6 RevenueCat · E3 hosting |

<details>
<summary>Αρχείο: Φάση 1 — Demo-ready MVP (ολοκληρώθηκε)</summary>

### 1.1 · `B2` Λίστα & προφίλ προμηθευτή (buyer)

**Στόχος.** Ο buyer να ανοίγει τη λίστα προμηθευτών και το προφίλ μεμονωμένου προμηθευτή και να αισθάνεται ότι βλέπει «σοβαρή» B2B εφαρμογή, ισάξια με τις υπόλοιπες οθόνες της Φάσης B.

Οι πρωτόλειες ανάγκες (κάρτες με stars, verified/Νέος, CTAs, πλούσιο προφίλ κ.λπ.) έχουν καλυφθεί στο τρέχον κώδικα.

---

### 1.2 · Εγχειρίδιο testers (1 σελίδα)

**Στόχος.** Ένα αρχείο για testers.

**Δείτε** [`TESTING_GUIDE.md`](TESTING_GUIDE.md).

---

### 1.3 · Επαλήθευση συνδρομής end-to-end στο iPhone

**Στόχος.** Να επιβεβαιωθεί ότι η ροή συνδρομής λειτουργεί σε φυσική συσκευή μετά από clean Xcode build.

**Τι πρέπει να θυμάσαι από παλαιότερα sessions:** αν το Metro είναι σε μη-default port ή το embedded bundle είναι stale → **Clean Build Folder → Run**.

**Checklist επαλήθευσης** (ενημερώνεται αν αλλάξει το copy του UI):

- [ ] Xcode → **Product → Clean Build Folder** (`Shift+Cmd+K`).
- [ ] **Product → Run** (`Cmd+R`).
- [ ] Login ως buyer → Λογαριασμός → ροές `/subscription`, upgrade/downgrade mock, λοκ/export στο Παραγγελίες σύμφωνα με Πλάνο (`TESTING_GUIDE`).

Αρχεία: κανένα — validation μόνο.

</details>

<details>
<summary>Αρχείο: Φάση 2 — S5 enforcement (ολοκληρώθηκε για demo)</summary>

### 2.1 · `S5.a` Monthly order counter

Υλοποιημένο: `402 monthly_limit_reached`, `GET /api/me/orders/usage`, UI badge προειδοποίησης, handling στο checkout.

---

### 2.2 · `S5.b` Favorites cap

Υλοποιημένο: πίνακας `favorites`, REST endpoints, mutations + `FavoriteSupplierHeart` με paywall/402 όταν φτάνεις στο όριο αποθηκευμένων (free tier).

---

### 2.3 · `S5.c` History window

Υλοποιημένο: φιλτράρισμα με `historyWindowDays`, paywall row, gate στο `order-detail` για χρονικά εκτός παραθύρου στο free tier.

</details>

<details>
<summary>Αρχείο: Φάση 3.1 Multi-location — ολοκληρώθηκε για demo</summary>

### 3.1 · `S5.d` Multi-location & team seats

Οι βασικές ανάγκες demo (πινάκια `locations` / μέλη / προσκλήσεις, οθόνες `app/locations/*`, ενεργό κατάστημα στην Αρχική/Παραγγελίες/Checkout, gating ανά Πλάνο) είναι στο repo. Το μέρος «πλήρης διεύθυνση email invite από μηχανικό SMTP παραγωγής» μπορεί να εμβαθυνεί στη Φάση 4 αν χρειαστεί.

</details>

---

## Φάση 3 — Τι ανοίγει μετά το κλείσιμο demo

**Ολοκληρωμένο:** 3.1 locations, 3.3 έξοδα, **3.2 price alerts στο επίπεδο demo**. **Επέκταση παραγωγής (όχι block για τοπικό demo):** σταθερές APN, outbound email, SLA worker.

### 3.2 · Price alerts (`S5.e`) — demo έτοιμο, παραγωγική σκληράνση εκτός scope MVP

Ο πυρήνας υπάρχει στο repo (`POST/GET`/CRUD στο platform, λίστα `app/price-alerts.tsx`, ροή προϊόντος με `canSetPriceAlerts`, περιοδική `evaluatePriceAlerts` κατά τον τρέχοντα διακομιστή). Για διακομιστές χωρίς συνεχή uptime ή χωρίς SMTP / APN διαμόρφωση τα ερεθίσματα push/email είναι **κατά περίπτωση** — διαφανές στο testers guide.

<details>
<summary>Αρχικό spec (αρχείο)</summary>

**Στόχος.** Ο buyer να ορίζει όριο τιμής ανά προϊόν.

**Κατάσταση:** Υλοποιημένο στο demo· παραγωγή = APN + SMTP + hosting.

**Απαιτήσεις (αρχείο).**

- **Data model**: `price_alerts`…
- **Endpoints**: CRUD.
- **Worker**: interval + push/email.

</details>

<details>
<summary>Αρχείο: 3.3 Έξοδα — ολοκληρώθηκε</summary>

### 3.3 · Συγκριτικά κόστους / οθόνη Έξοδα

Υπάρχουν: `GET /api/me/spending`, `app/spending.tsx`, `useSpendingQuery`, πρόσβαση από Αρχική (γρήγορη ενέργεια) και Λογαριασμό, ρυθμός εύρους συγκρίσεων ανά συνδρομή όπως ορίζει το κώδικα.

</details>

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

## Επιλογή προτεραιοτήτων (μετά το κλείσιμο demo)

1. **Χειροκίνητα:** Φάση 1.3 subscription στο φυσικό iPhone (βλέπε [`TESTING_GUIDE.md`](TESTING_GUIDE.md) §§1 & 6).
2. **Backlog προϊόντος:** 3.2 price alerts αν θες πλήρες `FeatureSet` πριν App Store review.
3. **Παραγωγή:** Φάση 4.2 (`E3` hosting/HTTPS/secrets), μετά Φάση 4.1 (`S6` RevenueCat + IAP).

---

*Ενημερώθηκε: 17 Μαΐου 2026 — κλείσιμο demo-setup checklist· η υλοποίηση ευθυγραμμίστηκε με τον πίνακα κατάστασης στην κορυφή.*
