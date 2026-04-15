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
};

export type Product = {
  id: string;
  supplierId: string;
  name: string;
  unit: string;
  price: string;
  availability: "Άμεσα διαθέσιμο" | "Περιορισμένο";
  category: string;
};

export type OrderStatus = "Νέα" | "Σε επεξεργασία" | "Καθ' οδόν" | "Ολοκληρώθηκε";

export type Order = {
  id: string;
  supplierName: string;
  status: OrderStatus;
  total: string;
  itemCount: number;
  deliveryWindow: string;
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
  },
];

export const featuredProducts: Product[] = [
  {
    id: "1",
    supplierId: "1",
    name: "Brazil Santos Espresso Blend",
    unit: "1 κιλό",
    price: "18,90€",
    availability: "Άμεσα διαθέσιμο",
    category: "Καφές",
  },
  {
    id: "2",
    supplierId: "2",
    name: "Ντομάτα αποφλοιωμένη κονκασέ",
    unit: "5 κιλά",
    price: "10,40€",
    availability: "Άμεσα διαθέσιμο",
    category: "Πρώτες Ύλες",
  },
  {
    id: "3",
    supplierId: "3",
    name: "Ποτήρι χάρτινο διπλό 12oz",
    unit: "50 τεμ.",
    price: "3,60€",
    availability: "Περιορισμένο",
    category: "Αναλώσιμα",
  },
];

export const recentOrders: Order[] = [
  {
    id: "ord-1042",
    supplierName: "Aegean Coffee Trade",
    status: "Σε επεξεργασία",
    total: "146,20€",
    itemCount: 8,
    deliveryWindow: "Αύριο 08:00–11:00",
  },
  {
    id: "ord-1038",
    supplierName: "Fresh Roots Market",
    status: "Καθ' οδόν",
    total: "212,00€",
    itemCount: 14,
    deliveryWindow: "Σήμερα 13:00–15:00",
  },
  {
    id: "ord-1031",
    supplierName: "Blue Pack Essentials",
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
