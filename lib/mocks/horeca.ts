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
    id: "sup-1",
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
    id: "sup-2",
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
    id: "sup-3",
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
    id: "prd-1",
    supplierId: "sup-1",
    name: "Brazil Santos Espresso Blend",
    unit: "1 κιλό",
    price: "18,90€",
    availability: "Άμεσα διαθέσιμο",
    category: "Καφές",
  },
  {
    id: "prd-2",
    supplierId: "sup-2",
    name: "Ντομάτα αποφλοιωμένη κονκασέ",
    unit: "5 κιλά",
    price: "10,40€",
    availability: "Άμεσα διαθέσιμο",
    category: "Πρώτες Ύλες",
  },
  {
    id: "prd-3",
    supplierId: "sup-3",
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
