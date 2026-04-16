# Κατάσταση έργου — 16 Απριλίου 2026

## Περίληψη ημέρας

Σήμερα ολοκληρώθηκε η **σύνδεση της εφαρμογής (Expo / React Native + Xcode) με την τοπική πλατφόρμα API (Hono, θύρα 3010)** σε φυσικό iPhone, διορθώθηκε το **build στο Xcode** (PhaseScript / EXConstants), και προστέθηκε **σχέδιο dual‑role** (ένα app, buyer + supplier). Η εφαρμογή **φορτώνει πλέον δεδομένα από το API** στην αρχική οθόνη (κατάλογος από seed DB — ίδια δεδομένα με το `lib/mocks/horeca.ts`).

---

## Τι κάναμε σήμερα (16/4/2026)

### Διάγνωση σφαλμάτων σύνδεσης

- Διαχωρισμός μηνυμάτων: **«Λείπει το API»** (`getApiBaseUrl()` κενό) vs **«Δεν φτάνει στο API»** (`Network request failed` / `Failed to fetch` από `app/sign-in.tsx`).
- **Safari** στο ίδιο iPhone μπορούσε να ανοίξει `/health` ενώ το app απέτυχε — αιτίες που διορθώθηκαν:
  - **Λάθος πόρτα στο Xcode:** το `ios/.xcode.env` είχε προεπιλογή `http://127.0.0.1:3000` → με rewrite σε LAN έβγαινε `…:3000` αντί για **3010** (η πλατφόρμα ακούει στο `PORT` του `.env`, π.χ. 3010).
  - **iOS / τοπικό δίκτυο:** προστέθηκε **`NSLocalNetworkUsageDescription`** στο `Info.plist` και στο `app.config.ts` ώστε το `fetch` προς `192.168.x.x` να μην μπλοκάρεται χωρίς δήλωση (το Safari δεν επηρεάζεται με τον ίδιο τρόπο).

### Build Xcode — `PhaseScriptExecution failed`

- Αιτία: το `app.config.ts` έκανε `import "./scripts/load-env.mjs"` — το script **EXConstants** (`getAppConfig.js`) φορτώνει το config με **`require()`** → **`ERR_REQUIRE_ESM`**.
- **Λύση:** προστέθηκε **`scripts/load-env.cjs`** (ίδια λογική με το `load-env.mjs`) και στο `app.config.ts` χρησιμοποιείται **`require("./scripts/load-env.cjs")`** ώστε το Xcode να παράγει το `app.config` για το `EXConstants` χωρίς σφάλμα.

### Αρχεία περιβάλλοντος iOS

- Ενημερώθηκε **`ios/.xcode.env`:** προεπιλογή **`http://127.0.0.1:3010`** (ευθυγράμμιση με τυπικό `PORT` πλατφόρμας).
- Προστέθηκαν **`ios/.xcode.env.local.example`**, **`ios/.xcode.env.local`** (τοπικό LAN URL, gitignored μέσω `.gitignore`), και εγγραφή **`ios/.xcode.env.local`** στο `.gitignore`.
- **Σημείωση:** άνοιγμα πάντα **`HorecaSource.xcworkspace`** (όχι μόνο `.xcodeproj`) ώστε να συμπεριλαμβάνονται τα CocoaPods.

### Τεκμηρίωση προϊόντος / roadmap

- Προστέθηκε **`docs/DUAL_ROLE_ROADMAP.md`:** σχέδιο φάσεων για **ένα app**, **διαφορετικά tabs/screens** για buyer vs supplier, αρχές UI B2B και σειρά υλοποίησης (Φάση A–E).

### Κώδικας που είχε ήδη γίνει νωρίτερα την ίδια μέρα (αναφορά)

- **`lib/api/http.ts`:** μηνύματα timeout ανά περιβάλλον (`__DEV__` vs production).
- **`app/sign-in.tsx`:** χαρτογράφηση σφαλμάτων δικτύου, εμφάνιση κωδικού (εικονίδιο visibility).

---

## Κατάσταση μετά τις διορθώσεις

- **Τοπική ανάπτυξη:** `pnpm dev` (πλατφόρμα + Metro)· το iPhone συνδέεται στο Metro και στο API στη σωστή IP/πόρτα.
- **Δεδομένα στην εφαρμογή:** έρχονται από το **API** (SQLite πλατφόρμας)· το περιεχόμενο καταλόγου προέρχεται από **seed** (`scripts/seed-platform.ts` από `lib/mocks/horeca.ts`) — εμφανίζεται ως “πραγματικό” HTTP, όχι στατικό mock μέσα στο React.

---

## Επόμενα βήματα (ενδεικτικά)

- Υλοποίηση **Φάσης A** του `docs/DUAL_ROLE_ROADMAP.md` (ξεχωριστό shell πλοήγησης για supplier με tab bar, ρόλος από session API).
- Παραγωγή: hosted API **HTTPS** + `EXPO_PUBLIC_API_BASE_URL` παραγωγής, TestFlight.

---

*Τελευταία ενημέρωση αρχείου: 16 Απριλίου 2026.*
