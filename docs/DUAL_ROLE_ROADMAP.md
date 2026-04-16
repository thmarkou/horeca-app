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
- [ ] **B2.** Λίστα προμηθευτών / προφίλ προμηθευτή: συνέπεια με cards, verified badge, σαφή CTAs.
- [x] **B2/B3.** Παραγγελίες buyer: φίλτρα Ενεργές/Ιστορικό/Όλες με counts, empty states ανά φίλτρο, κάρτες με Λεπτομέρειες/Επανάληψη (χωρίς nested touchable), δυναμικό `order-detail` που διαβάζει `id` από `useLocalSearchParams` και χρησιμοποιεί το ίδιο query cache με τη λίστα.
- [x] **B4.** Λογαριασμός buyer: avatar, όνομα/email/ρόλος από SecureStore, κάρτα συνδρομής ("Δωρεάν demo" — honest placeholder), έξοδος μέσω `Api.signOut()`. Καμία hardcoded demo επιχείρηση, καμία sign-in/sign-up CTA σε authenticated οθόνη, χωρίς supplier snapshot.

**Παράδοση:** Ροή buyer “demo‑ready” για demo σε πελάτη (χωρίς απαραίτητα νέα backend features).

---

### Φάση C — Οθόνες supplier (λειτουργική εφαρμογή)

**Στόχος:** Ο supplier να **δουλεύει** από το κινητό, όχι μόνο να βλέπει αριθμούς.

- [x] **C1.** Πίνακας: greeting + όνομα, hero προτεραιότητας όταν υπάρχουν νέες παραγγελίες, 2x2 metric tiles (Νέες / Σε επεξεργασία / Χαμηλό απόθεμα / Τζίρος), preview επόμενων παραδόσεων με status pills. Αφαιρέθηκε το “Supplier dashboard” ως τίτλος‑μόκο.
- [x] **C2.** Λίστα παραγγελιών supplier: φίλτρα (Νέες / Σε επεξεργασία / Καθ' οδόν / Ολοκληρωμένες / Όλες) με live counts, status pills ανά κάρτα, empty states ανά φίλτρο, horizontal scroll στα chips.
- [x] **C3.** Λεπτομέρεια παραγγελίας: shared `/order-detail` route που δέχεται `id` — δουλεύει και για supplier από το Dashboard & Orders preview. Στοιχεία επικοινωνίας buyer παραμένουν για Φάση E (όταν το API τα παρέχει).
- [ ] **C4.** Θέση για **κατάλογο** (προϊόντα τιμές) — placeholder· ενεργοποιείται με API.

**Παράδοση:** Supplier μπορεί να χρησιμοποιήσει την εφαρμογή ως “κανονικό” εργαλείο ημέρας.

---

### Φάση D — Design system & επανάχρηση

**Στόχος:** Λιγότερο duplicate code, πιο “premium” look.

- [ ] **D1.** Κοινά components: `SectionHeader`, `StatCard`, `EmptyState`, `ListRow`.
- [ ] **D2.** Έλεγχος `tailwind` / NativeWind για **ίδια spacing** σε όλες τις οθόνες.
- [ ] **D3.** Splash / onboarding copy (προαιρετικά) 1 οθόνα “τι κερδίζεις” πριν το sign‑in.

---

### Φάση E — Backend & ασφάλεια (όταν το προϊόν το απαιτεί)

- [ ] **E1.** Endpoints που επιστρέφουν **μόνο** παραγγελίες του supplier X / buyer Y.
- [ ] **E2.** Σύνδεση `users` ↔ `suppliers` για supplier accounts (ποιος supplier είναι “εγώ”).
- [ ] **E3.** Rate limiting, HTTPS παραγωγής, μυστικά εκτός repo.

---

## 6. Σειρά εκτέλεσης (συνοπτικά)

1. **Φάση A** (πλοήγηση + ρόλος) — πρώτα, για να μην χτίζεις UI πάνω σε λάθος shell.  
2. **Παράλληλα λεπτά:** κείμενα supplier στα ελληγικά + αφαίρεση αγγλικών τίτλων.  
3. **Φάση B** και **C** εναλλάξ ή ανά sprint (buyer demo vs supplier demo).  
4. **D** συνεχώς όταν επαναλαμβάνεται pattern.  
5. **E** πριν πραγματικούς πελάτες εκτός dev.

---

## 7. Ορισμός επιτυχίας (MVP dual‑role)

- [ ] Δύο λογαριασμοί demo (buyer + supplier) με **διακριτή εμπειρία** χωρίς σύγχυση.
- [ ] Κενές καταστάσεις και λάθη χειρισμένα αξιοπρεπώς.
- [ ] Χωρίς αχρείαστα αγγλικά στο κύριο UI.
- [ ] Ένα εγχειρίδιο 1 σελίδας για testers: “Πώς συνδέομαι ως buyer / supplier”.

---

## 8. Σημείωση για συνδρομές (μελλοντικά)

Η χρέωση (buyer, supplier, ή commission) είναι **επιχειρηματική** — το app απλά θα διαβάζει `subscription` / `plan` από το API και θα κρύβει/δείχνει features. Δεν μπλοκάρει τις φάσεις A–D.

---

*Τελευταία ενημέρωση: σχέδιο για επανεκκίνηση υλοποίησης dual‑role.*
