> **Επίσημο checklist demo:** δες [`TESTING_GUIDE.md`](TESTING_GUIDE.md). Τα παρακάτω είναι rough smoke-notes από παλαιότερα sessions.
Τι θα δεις στη συσκευή
Όταν τρέξεις pnpm dev και κάνεις login ως buyer:

Άνοιξε ένα προϊόν → δες τον qty stepper, αύξησε σε π.χ. 5, πάτησε «Προσθήκη»
Επιστροφή στην αρχική → βλέπεις floating cart pill με «1 είδος · 94,50 €»
Πάτα στο pill → στο cart screen βλέπεις το προϊόν grouped κάτω από τον supplier του
Πρόσθεσε προϊόν από διαφορετικό supplier → στο cart εμφανίζονται 2 ξεχωριστά supplier groups με δικά τους subtotals
Στο cart row, το «-» στο qty=1 γίνεται trash icon και αφαιρεί το item
Reset app → τα items παραμένουν (AsyncStorage persistence)

Fash 0.2
Fash 0.3
Έτοιμο για Xcode test
Όλες οι αλλαγές είναι pure JS/TS — δεν χρειάζεται rebuild, μόνο Metro reload (r στο terminal).

Smoke test που προτείνω από iPhone:

Buyer login → πρόσθεσε προϊόντα από 2 διαφορετικούς suppliers στο cart.
Cart → «Προχώρα σε checkout».
Στο checkout: γράψε ξεχωριστή σημείωση σε κάθε supplier card → «Αποστολή 2 παραγγελιών».
Θα δεις iOS alert «2 παραγγελίες δημιουργήθηκαν» → OK → πάει στο Orders tab → πρέπει να εμφανιστούν και οι δύο καινούργιες παραγγελίες στην κορυφή.
Δοκίμασε και 1-supplier flow για τη μονομερή διατύπωση («Η παραγγελία δημιουργήθηκε»).

Fash 0.4
iPhone smoke test που προτείνω
Με Fast Refresh ενεργό απλά reload μετά τα saves, ή shake → Reload:

Buyer flow: φτιάξε μια καινούργια παραγγελία (Phase 0.3). Στο Orders tab πάτα το νέο order → πρέπει να ανοίξει instant (cache prepopulation), να δεις τα items, τη σημείωση που έγραψες, και το totalEur.
Reorder: στο order-detail πάτα «Επανάληψη παραγγελίας» → Alert «Προστέθηκαν Χ είδη» → «Δες το καλάθι» → το cart να έχει όλες τις γραμμές με τις σωστές ποσότητες.
Mixed cart: πρόσθεσε πρώτα κάτι από διαφορετικό supplier, μετά πάτα reorder σε άλλη παραγγελία → το Alert πρέπει να αναφέρει «Στο καλάθι υπάρχουν ήδη προϊόντα από Χ προμηθευτή».
Not-found: άλλαξε το id στο URL μέσω deep-link ή κάνε log out και ξανα-login ως supplier και προσπάθησε να ανοίξεις buyer order → πρέπει να δεις «Η παραγγελία δεν βρέθηκε» (όχι details).
Supplier view: ως supplier πάτα μία παραγγελία από το dashboard list → πρέπει να δεις το όνομα του buyer (όχι το δικό σου storefront name) στον τίτλο.

Fash 0.5

1. Supplier — Accept flow

Login ως supplier → δες μια παραγγελία με status "Νέα" στη λίστα.
Τάπε για να ανοίξει το order detail → εμφανίζονται 2 κουμπιά: Αποδοχή (γεμάτο primary) + Απόρριψη (outline).
Πάτα Αποδοχή → Alert «Αποδοχή παραγγελίας», πάτα Επιβεβαίωση → spinner για λίγο → η status pill γίνεται "Σε επεξεργασία" χωρίς full screen reload, και το κουμπί αλλάζει σε "Σήμανση ως παραδόθηκε". 2) Supplier — Reject flow

Πιάσε άλλη "Νέα" παραγγελία → Απόρριψη → στο iOS Alert το «Επιβεβαίωση» θα είναι κόκκινο (destructive style) → πάτα το → η status pill γίνεται "Ακυρώθηκε" με κόκκινη απόχρωση. 3) Supplier — Mark Delivered

Από order σε "Σε επεξεργασία" → πάτα Σήμανση ως παραδόθηκε → confirm → γίνεται "Ολοκληρώθηκε" (πράσινη απόχρωση), τα action buttons εξαφανίζονται (terminal state). 4) Συγχρονισμός λίστας

Πήγαινε πίσω στο supplier orders tab → η παραγγελία πρέπει να εμφανίζεται με το νέο status χωρίς manual refresh (thanks στο invalidate recentOrders).
Στο dashboard η KPI «Νέες παραγγελίες» πρέπει να έχει μειωθεί ή αυξηθεί (thanks στο invalidate supplierOperationalSummary). 5) Buyer view δεν έχει actions

Login ως buyer → άνοιξε την ίδια παραγγελία → βλέπεις μόνο το «Επανάληψη παραγγελίας» (κανένα Accept/Reject) γιατί viewerRole === "buyer". 6) Race condition / stale state

(Optional) Αν θες να δοκιμάσεις το 409: άνοιξε την ίδια "Νέα" παραγγελία σε 2 supplier sessions, πάτα Αποδοχή στο ένα, μετά στο άλλο πάτα Απόρριψη → πρέπει να δεις Alert «Invalid status transition».

Fash 0.6
iPhone smoke test που προτείνω

1. Νέος Supplier sign-up:

Από το welcome → Sign Up → δώσε επωνυμία (π.χ. «Test Σούπα Φούρνος»), email, password, διάλεξε ρόλο «Προμηθευτής» → Συνέχεια.
Πρέπει να μπεις στο supplier-tabs (dashboard / orders / catalog / account).
Πάτα Catalog tab → πρέπει να ανοίγει η οθόνη «Τα προϊόντα μου» κενή (όχι error / σφάλμα φόρτωσης) γιατί τώρα υπάρχει supplier row για τον user.
Πάτα Orders tab → πρέπει να εμφανίζει empty state αντί για σφάλμα. 2) Buyer πλέκει επαφή με τον νέο supplier:

Logout, register νέο buyer ή login με υπάρχοντα.
Στο catalog → πάτα φίλτρο «Λοιπά» (νέα κατηγορία) → ο νέος supplier πρέπει να εμφανιστεί με τα defaults (rating 0.0, "Δεν έχει οριστεί", verified badge απών).
Άνοιξε το supplier profile → πρέπει να δουλέψει χωρίς crash, η λίστα προϊόντων θα είναι κενή (Phase 0.7 θα προσθέσει το product creation στο supplier side). 3) Verify atomic rollback (optional manual test):

Δεν είναι εύκολο να το τεστάρεις χωρίς να σπάσεις τη DB, αλλά είναι καλυμμένο μέσω του transaction wrapper — αν σκάσει το supplier insert (πχ NOT NULL constraint violation), ο user insert κάνει rollback.

Fash 0.7 6. Smoke tests (live API)

Σενάριο Status Result
GET profile νέου supplier
200
Defaults από Phase 0.6
PATCH 5 fields
200
Updated row, rating=0 & verified=false παραμένουν
PATCH empty body {}
400
"At least one field is required"
PATCH από buyer token
403
"Supplier role required"
iPhone smoke test που προτείνω
Πιθανώς χρειάζεται force reload (shake → Reload) γιατί προστέθηκε νέο route στο stack. Fast Refresh συνήθως το πιάνει αλλά route changes είναι ευαίσθητα.

1. Edit flow:

Login ως supplier (παλαιός demo supplier@horeca.demo ή νέος που μόλις φτιάξατε).
Στο Λογαριασμός tab → πάτα «Επεξεργασία προφίλ καταστήματος».
Πρέπει να ανοίξει η νέα οθόνη με τα τρέχοντα values προσυμπληρωμένα.
Άλλαξε δύο πεδία (π.χ. tagline + minimum order) → πάνω δεξιά εμφανίζεται «Μη αποθηκευμένες αλλαγές» (warning tone).
Πάτα Αποθήκευση → Alert «Αποθηκεύτηκε» → OK → επιστρέφει στο Λογαριασμός tab. 2) Empty change:

Ξανανοίξε την οθόνη → πάτα Αποθήκευση χωρίς αλλαγή → πρέπει να εμφανιστεί Alert «Καμία αλλαγή». 3) Category chips:

Στο πεδίο Κατηγορία, πάτα ένα chip από τα ήδη υπάρχοντα → η τιμή του input αλλάζει αυτόματα + το chip γίνεται highlighted (primary background).
Πληκτρολόγησε νέα κατηγορία (π.χ. «Βιολογικά») → νέο chip εμφανίζεται highlighted (καθώς είναι το current value). 4) Buyer-side reflection:

Logout → login ως buyer → πήγαινε στο Suppliers tab → πάτα τον supplier που μόλις τροποποιήθηκε → πρέπει να βλέπεις τα νέα values αμέσως (thanks στο setQueryData(supplierById, ...)). 5) Required guards:

Στο supplier edit screen, καθάρισε το πεδίο Επωνυμία → πάτα Αποθήκευση → Alert «Συμπλήρωσε όλα τα πεδία».
Με την 0.7 ολοκληρώνεται η Φάση 0 (Close existing CRUD gaps). Το CRUD core είναι πλήρες:

Buyer: discover → add to cart → checkout (multi-supplier) → view orders → reorder
Supplier: auto-storefront on register → edit profile → manage products → accept/reject/deliver orders
Επόμενα βήματα στο roadmap (Phase 1+):

Onboarding completion gate — εμφάνιση supplier σε buyer catalog μόνο όταν έχει συμπληρώσει profile (όχι "Λοιπά" / "Δεν έχει οριστεί") + έχει ≥1 προϊόν.
Search & filters — text search σε products/suppliers, filter by price range, delivery time, MOQ.
Reviews / ratings — buyer μπορεί να βαθμολογήσει supplier μετά από completed order → το rating field γίνεται real (όχι placeholder).
Push notifications — supplier παίρνει notification στο νέο order, buyer στο status change.
Ποιο θες να βάλουμε επόμενο;

Fash 1+
Τι να δοκιμάσεις στο iPhone
Login ως buyer → Suppliers tab.
Κάτω-κάτω στη λίστα θα δεις τους test suppliers («Refine Test», «Test Supplier ...») με «Νέος» pill αντί για empty rating και χωρίς το αόριστο placeholder tagline.
Tap σε «Νέο» supplier → στο hero θα δεις το ίδιο «Νέος» pill και ένα ευγενικό «Ο προμηθευτής συμπληρώνει το προφίλ του» αντί για το default highlight.
Στο header της λίστας: count badge «X συνεργάτες».
Φιλτράρισε με κατηγορία που δεν έχει αποτελέσματα → «Καθάρισε φίλτρα» CTA.
Έτοιμοι για Φάση 1.2 όποτε πεις — Cart sync με τον buyer (persistent cart πάει στο backend, share device-to-device, multi-supplier checkout polish).

Fash 1.2
Τι να δοκιμάσεις στο iPhone (Metro reload r)
Login ως buyer στο iPhone A → πρόσθεσε προϊόντα.
Σύνδεση ίδιος buyer σε άλλη συσκευή/simulator → cart εμφανίζεται γεμάτος.
Sign out → sign in με άλλον buyer → κενό cart (πια όχι leak).
Checkout: πρόσθεσε λίγο από καφέ supplier (€18.90 × 1) → δες warning «Κάτω από το ελάχιστο των 80€. Λείπουν 61,10€».
Στο header του checkout: «1 Προμηθευτής · 1 Είδη · 18,90€» strip.
Πες όποτε θες να προχωρήσουμε στην επόμενη φάση. Με βάση το WORK_REMAINING.md priority list, το highest-impact επόμενο είναι η Φάση 2.1 — Monthly order counter (10 παραγγελίες/μήνα cap για free buyers, paywall στην 11η). 2–3h, σαφές demo value.

Fash 2.1

Fash 2.3
Το «+N» (στην εφαρμογή γράφεται κάτι σαν «+3 παλαιότερες παραγγελίες») δεν είναι μαθηματικό σύμβολο ξεχωριστό· είναι αριθμός + κείμενο.

N = πόσες παραγγελίες έχεις φορτώσει από το API αλλά δεν τις δείχνει η λίστα γιατί είναι πιο παλιές από το δωρεάν παράθυρο (π.χ. 30 ημέρες).
Το «+» σημαίνει απλά «επιπλέον τόσες που κρύβονται πίσω από το όριο» — δηλαδή «υπάρχουν κι άλλες εκτός αυτού που βλέπεις».
Πρακτικά: η εφαρμογή παίρνει μια λίστα παραγγελιών (μέχρι π.χ. 100), τις χωρίζει σε εντός vs εκτός του παραθύρου ημερών, δείχνει μόνο τις εντός, και στο τέλος γράφει +N = «τόσες από αυτές που φορτώσαμε είναι παλιότερες και δεν εμφανίζονται».

Σημαντικό: το N μετράει μόνο μέσα στις παραγγελίες που ήρθαν σε αυτό το request· αν έχεις πάνω από 100 παλιές, το N μπορεί να είναι μικρότερο από το πραγματικό σύνολο (είναι «τουλάχιστον N» στη λογική του demo, όπως είχε σημειωθεί στο chat κατά την υλοποίηση).

Fash 2.2
Tests
tests/mobile-mvp.test.ts — Νέο block «Phase 2.2» (schema favorites, routes, "favorites_limit_reached", hooks, strings στο favorites.tsx / suppliers.tsx).
Μετά την εφαρμογή: pnpm db:push, pnpm check, pnpm test.
