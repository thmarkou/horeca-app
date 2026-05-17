/**
 * Starter catalog samples used by `pnpm db:seed` to populate the central platform DB.
 * App screens load live data from the API, not from these arrays at runtime.
 */
export type UserRole = "buyer" | "supplier";

export type SupplierCategory =
  | "Καφές"
  | "Πρώτες Ύλες"
  | "Αναλώσιμα"
  | "Κατεψυγμένα"
  | "Ποτά"
  | "Εξοπλισμός";

export type Supplier = {
  id: string;
  name: string;
  category: SupplierCategory;
  location: string;
  rating: number;
  deliveryTime: string;
  minimumOrder: string;
  verified: boolean;
  highlight: string;
  /**
   * `false` όταν ο supplier μόλις εγγράφηκε και δεν έχει συμπληρώσει το προφίλ
   * (Phase 0.6 defaults). Το UI το χρησιμοποιεί για «Νέος» pill και για να
   * παρακάμψει το γενικό placeholder tagline. Optional για backwards compat
   * με τα demo mock data — απουσία θεωρείται «onboarded» (rich seed data).
   */
  isOnboarded?: boolean;
  /**
   * Optional geo coordinates για το map preview στο supplier profile.
   * Κρατιούνται προαιρετικά ώστε το UI να αποκρύπτει το χάρτη αν λείπουν.
   */
  latitude?: number;
  longitude?: number;
};

export type Product = {
  id: string;
  supplierId: string;
  name: string;
  unit: string;
  /** Localized display string, e.g. "18,90 €". Use for UI text only. */
  price: string;
  /**
   * Raw unit price as number (EUR). Source of truth για cart math, total
   * calculations και οποιαδήποτε σύγκριση τιμής. Δεν παίζει role σε display
   * — γι' αυτό υπάρχει χωριστά από το `price`.
   */
  priceEur: number;
  availability: "Άμεσα διαθέσιμο" | "Περιορισμένο";
  category: string;
};

export type OrderStatus =
  | "Νέα"
  | "Σε επεξεργασία"
  | "Καθ' οδόν"
  | "Ολοκληρώθηκε"
  | "Ακυρώθηκε";

export type Order = {
  id: string;
  supplierName: string;
  /**
   * Name of the *other* party in the order from the authenticated user's
   * perspective. For buyers this equals `supplierName`. For suppliers it is
   * the buyer (shop) that placed the order. Keeps the UI role-agnostic while
   * preserving `supplierName` for buyer-side screens that need it explicitly.
   */
  counterpartyName: string;
  status: OrderStatus;
  total: string;
  itemCount: number;
  deliveryWindow: string;
  /** Unix epoch ms από το API· optional για mocks χωρίς ημερομηνία. */
  createdAt?: number;
  /** Φάση 3.1: SQL id του συνδεδεμένου buyer location (ως string στο wire). */
  locationId?: string;
};

export const supplierCategories: SupplierCategory[] = [
  "Καφές",
  "Πρώτες Ύλες",
  "Αναλώσιμα",
  "Κατεψυγμένα",
  "Ποτά",
  "Εξοπλισμός",
];

export const suppliers: Supplier[] = [
  {
    id: "1",
    name: "Aegean Coffee Trade",
    category: "Καφές",
    location: "Αθήνα",
    rating: 4.9,
    deliveryTime: "Παράδοση σε 24 ώρες",
    minimumOrder: "Ελάχιστη παραγγελία 80€",
    verified: true,
    highlight: "Specialty καφέδες, γάλατα barista και συνοδευτικά για καφετέριες.",
    // Μεταξουργείο / κέντρο Αθήνας — αντιπροσωπευτικό σημείο εμπορικού κέντρου
    latitude: 37.9838,
    longitude: 23.7275,
  },
  {
    id: "2",
    name: "Fresh Roots Market",
    category: "Πρώτες Ύλες",
    location: "Θεσσαλονίκη",
    rating: 4.8,
    deliveryTime: "Παράδοση αυθημερόν",
    minimumOrder: "Ελάχιστη παραγγελία 120€",
    verified: true,
    highlight: "Φρέσκα λαχανικά, βότανα και εποχιακά προϊόντα για επαγγελματική κουζίνα.",
    // Αγορά Μοδιάνο / κέντρο Θεσσαλονίκης
    latitude: 40.636,
    longitude: 22.9418,
  },
  {
    id: "3",
    name: "Blue Pack Essentials",
    category: "Αναλώσιμα",
    location: "Πειραιάς",
    rating: 4.7,
    deliveryTime: "Παράδοση σε 48 ώρες",
    minimumOrder: "Ελάχιστη παραγγελία 60€",
    verified: true,
    highlight: "Συσκευασίες take away, ποτήρια, καπάκια και υλικά καθαριότητας.",
    // Λιμάνι Πειραιά
    latitude: 37.9375,
    longitude: 23.6475,
  },
];

export const featuredProducts: Product[] = [
  {
    id: "1",
    supplierId: "1",
    name: "Brazil Santos Espresso Blend",
    unit: "1 κιλό",
    price: "18,90€",
    priceEur: 18.9,
    availability: "Άμεσα διαθέσιμο",
    category: "Καφές",
  },
  {
    id: "2",
    supplierId: "2",
    name: "Ντομάτα αποφλοιωμένη κονκασέ",
    unit: "5 κιλά",
    price: "10,40€",
    priceEur: 10.4,
    availability: "Άμεσα διαθέσιμο",
    category: "Πρώτες Ύλες",
  },
  {
    id: "3",
    supplierId: "3",
    name: "Ποτήρι χάρτινο διπλό 12oz",
    unit: "50 τεμ.",
    price: "3,60€",
    priceEur: 3.6,
    availability: "Περιορισμένο",
    category: "Αναλώσιμα",
  },
  {
    id: "4",
    supplierId: "1",
    name: "Colombian Single Origin Supremo",
    unit: "250 γρ.",
    price: "9,80€",
    priceEur: 9.8,
    availability: "Άμεσα διαθέσιμο",
    category: "Καφές",
  },
  {
    id: "5",
    supplierId: "1",
    name: "Κάψουλες espresso συμβατές (Nespresso)",
    unit: "100 τεμ.",
    price: "22,50€",
    priceEur: 22.5,
    availability: "Άμεσα διαθέσιμο",
    category: "Καφές",
  },
  {
    id: "6",
    supplierId: "1",
    name: "Γάλα barista πλήρες 1L",
    unit: "κιβώτιο 12 τεμ.",
    price: "18,60€",
    priceEur: 18.6,
    availability: "Άμεσα διαθέσιμο",
    category: "Καφές",
  },
  {
    id: "7",
    supplierId: "1",
    name: "Γάλα barista βρώμης 1L",
    unit: "κιβώτιο 12 τεμ.",
    price: "28,40€",
    priceEur: 28.4,
    availability: "Περιορισμένο",
    category: "Καφές",
  },
  {
    id: "8",
    supplierId: "1",
    name: "Σιρόπι βανίλια barista",
    unit: "750 ml",
    price: "7,20€",
    priceEur: 7.2,
    availability: "Άμεσα διαθέσιμο",
    category: "Καφές",
  },
  {
    id: "9",
    supplierId: "1",
    name: "Σκόνη κακάο premium",
    unit: "1 κιλό",
    price: "14,30€",
    priceEur: 14.3,
    availability: "Περιορισμένο",
    category: "Καφές",
  },
  {
    id: "10",
    supplierId: "2",
    name: "Ελαιόλαδο extra παρθένο",
    unit: "5 λίτρα",
    price: "42,00€",
    priceEur: 42,
    availability: "Άμεσα διαθέσιμο",
    category: "Πρώτες Ύλες",
  },
  {
    id: "11",
    supplierId: "2",
    name: "Αλεύρι τύπου 00",
    unit: "25 κιλά",
    price: "24,90€",
    priceEur: 24.9,
    availability: "Περιορισμένο",
    category: "Πρώτες Ύλες",
  },
  {
    id: "12",
    supplierId: "3",
    name: "Καπάκι καπουτσίνο 12oz",
    unit: "100 τεμ.",
    price: "4,80€",
    priceEur: 4.8,
    availability: "Άμεσα διαθέσιμο",
    category: "Αναλώσιμα",
  },
  {
    id: "13",
    supplierId: "3",
    name: "Χαρτοπετσέτες κουβέρ 24x24",
    unit: "2000 τεμ.",
    price: "19,60€",
    priceEur: 19.6,
    availability: "Άμεσα διαθέσιμο",
    category: "Αναλώσιμα",
  },
];

export const recentOrders: Order[] = [
  {
    id: "ord-1042",
    supplierName: "Aegean Coffee Trade",
    counterpartyName: "Aegean Coffee Trade",
    status: "Σε επεξεργασία",
    total: "146,20€",
    itemCount: 8,
    deliveryWindow: "Αύριο 08:00–11:00",
  },
  {
    id: "ord-1038",
    supplierName: "Fresh Roots Market",
    counterpartyName: "Fresh Roots Market",
    status: "Καθ' οδόν",
    total: "212,00€",
    itemCount: 14,
    deliveryWindow: "Σήμερα 13:00–15:00",
  },
  {
    id: "ord-1031",
    supplierName: "Blue Pack Essentials",
    counterpartyName: "Blue Pack Essentials",
    status: "Ολοκληρώθηκε",
    total: "89,40€",
    itemCount: 6,
    deliveryWindow: "Παραδόθηκε χθες",
  },
];

export const supplierOperationalSummary = {
  newOrders: 6,
  processingOrders: 11,
  lowStockItems: 4,
  todayRevenue: "1.280€",
};

const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  "1":
    "Μείγμα espresso υψηλής ποιότητας, κατάλληλο για επαγγελματικές μηχανές. Σημειώσεις καραμελωμένων καρπών.",
  "2":
    "Κονκασέ ντομάτας για σάλτσες και επαγγελματική κουζίνα. Συσκευασία 5 κιλών.",
  "3":
    "Χάρτινα ποτήρια διπλού τοιχώματος 12oz για takeaway. Συσκευασία 50 τεμαχίων.",
  "4":
    "100% arabica από την Κολομβία, μεσαίο καβούρδισμα. Ιδανικό για filter και espresso.",
  "5":
    "Συμβατές κάψουλες espresso, έντονη γεύση και κρέμα. Συσκευασία 100 τεμαχίων.",
  "6":
    "Πλήρες γάλα barista με σταθερή υφή αφρού. Κιβώτιο 12x1L.",
  "7":
    "Γάλα βρώμης barista, κατάλληλο για latte art και cappuccino. Κιβώτιο 12x1L.",
  "8":
    "Σιρόπι βανίλιας για flavored καφέδες και ροφήματα. Φιάλη 750ml με αντλία.",
  "9":
    "Premium σκόνη κακάο για ζεστές σοκολάτες και garnishing. Συσκευασία 1kg.",
  "10":
    "Extra παρθένο ελαιόλαδο πρώτης ψυχρής έκθλιψης, τσίγκινο δοχείο 5L.",
  "11":
    "Αλεύρι τύπου 00 για ζύμες πίτσας και ψωμιού. Σακί 25 κιλών.",
  "12":
    "Πλαστικά καπάκια για ποτήρι 12oz, συμβατά με τα ποτήρια διπλού τοιχώματος.",
  "13":
    "Χαρτοπετσέτες κουβέρ 24x24cm, μονόφυλλες, πακέτο 2000 τεμαχίων.",
};

/** Full product row for detail screen (mock). */
export function getProductDetailByNumericId(id: number) {
  const p = featuredProducts.find((x) => Number(x.id) === id);
  if (!p) return null;
  const supplier = suppliers.find((s) => s.id === p.supplierId);
  return {
    ...p,
    description:
      PRODUCT_DESCRIPTIONS[p.id] ??
      "Λεπτομέρειες από τον κατάλογο του προμηθευτή.",
    supplierName: supplier?.name ?? "",
  };
}
