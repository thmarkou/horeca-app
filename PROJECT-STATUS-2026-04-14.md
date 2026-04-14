# Κατάσταση έργου — 14 Απριλίου 2026

## Τι θέλουμε να δημιουργήσουμε

**Horeca Source** (working name) είναι μια **mobile-first B2B εφαρμογή προμηθειών** για επαγγελματίες της εστίασης (HORECA: ξενοδοχεία, εστιατόρια, καφέ, κ.λπ.).

### Στόχος προϊόντος

- Γρήγορη και αξιόπιστη **επανάληψη παραγγελιών** (reorder), όχι μόνο αναζήτηση προϊόντων.
- **Ανακάλυψη προμηθευτών**, κατάλογοι, καλάθι, checkout και παρακολούθηση παραγγελιών.
- Δύο βασικοί ρόλοι: **αγοραστής (buyer)** και **προμηθευτής (supplier)** — στο MVP η εμπειρία του αγοραστή είναι η κύρια.

### Τεχνολογική βάση (τρέχουσα)

- **Expo SDK 54**, **React Native**, **TypeScript**, **Expo Router** (file-based routing).
- **NativeWind v4** (Tailwind) για styling.
- **Backend**: Node **Express** + **tRPC** + **Drizzle ORM** (MySQL), OAuth (Manus template), με δυνατότητα επέκτασης για πραγματικά δεδομένα αντί για mocks.
- Το UI καλύπτει πολλές οθόνες (welcome, auth, tabs, κατάλογοι, καλάθι, παραγγελίες, supplier flows) — μέρος της λογικής βασίζεται ακόμα σε **mock δεδομένα** (`lib/mocks/horeca.ts`).

Λεπτομερής σχεδιασμός UX/οθονών: αρχείο **`design.md`** στο repo.

---

## Τι έχει γίνει μέχρι στιγμής (μέχρι 14/4/2026)

### Repository & συνεργασία

- Αρχικοποίηση **Git**, προσθήκη **`.gitignore`** (node_modules, env, Expo caches, iOS Pods κ.λπ.).
- **Push** του πηγαίου κώδικα στο GitHub: **`https://github.com/thmarkou/horeca-app`** (branch `main`).
- Το **`horeca_mobile_app.zip`** δεν περιλαμβάνεται στο repo (αποφεύγεται διπλότυπο).

### iOS / Xcode

- Εκτέλεση **`expo prebuild --platform ios`** — δημιουργήθηκε φάκελος **`ios/`** (σχέδιο Xcode **HorecaSource**).
- Εκτέλεση **`pod install`** τοπικά — εγκατάσταση CocoaPods.
- Στο git ανεβαίνουν `Podfile`, `Podfile.lock` και το native project· τα **`ios/Pods/`** μένουν εκτός git.
- Για build από Xcode: άνοιγμα **`ios/HorecaSource.xcworkspace`** (όχι μόνο `.xcodeproj`) και ρύθμιση **Signing** για συσκευή.

### Εξαρτήσεις & εργαλεία build (pnpm / Babel / NativeWind)

Λόγω **pnpm** (αυστηρό dependency tree), προστέθηκαν/διορθώθηκαν ρητά:

- **`babel-preset-expo`** (SDK 54) — απαιτείται από `babel.config.js`.
- **`@babel/core`** και **`@babel/plugin-transform-react-jsx`** — ώστε το Babel/Metro να επιλύει modules από το root του project.
- **`react-native-css-interop@0.2.1`** — απαιτείται για το JSX runtime του NativeWind· χωρίς άμεσο dependency το Metro δεν έβρισκε `react-native-css-interop/jsx-runtime`.

Μετά από αλλαγές σε εξαρτήσεις, χρήσιμο: **`npx expo start --clear`**.

### Scripts ανάπτυξης

- **`pnpm dev`**: τρέχει παράλληλα backend (`dev:server`) και Metro (`dev:metro`).
- **`pnpm exec expo run:ios`** (μετά το prebuild): build/τρέξιμο σε iOS simulator ή συσκευή.

---

## Επόμενα βήματα (ενδεικτικά)

- Μετάβαση από mocks σε **πραγματικό API/βάση** (σχήμα Drizzle, tRPC routers).
- Ολοκλήρωση **reusable UI components** (cards, badges, filters) όπου λείπουν.
- Σταθεροποίηση **web preview** (γνωστά θέματα `removeChild` στο `todo.md`, αν ισχύουν ακόμα).
- Τεκμηρίωση onboarding για νέους developers (clone, `pnpm install`, `pod install`, env vars).

---

*Αρχείο δημιουργήθηκε: 14 Απριλίου 2026.*
