import type { Order } from "@/lib/mocks/horeca";

/** Συγχρονίζεται με το `Math.min(...)` του `GET /api/orders/recent` στο backend. */
export const ORDERS_EXPORT_MAX_LIMIT = 500;

function csvEscape(value: string): string {
  if (/[,"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const dateFormatter = new Intl.DateTimeFormat("el-GR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Εξαγόμενες σειρές ανά πρόσφατη παραγγελία (λίστα όπως επιστρέφεται το recent orders API).
 */
export function ordersToUtf8CsvBody(orders: Order[]): string {
  const rows: string[][] = [
    [
      "κωδικός_παραγγελίας",
      "χρονοσήμανση_δημιουργίας",
      "κατάσταση",
      "προμηθευτής",
      "αντισυμβαλλόμενος",
      "αρ_ειδών",
      "σύνολο_εμφάνιση",
      "παράθυρο_παράδοσης",
      "id_τοποθεσίας",
    ],
  ];

  for (const o of orders) {
    const when =
      typeof o.createdAt === "number" ? dateFormatter.format(new Date(o.createdAt)) : "";
    rows.push([
      o.id,
      when,
      o.status,
      o.supplierName,
      o.counterpartyName,
      String(o.itemCount),
      o.total,
      o.deliveryWindow,
      o.locationId ?? "",
    ]);
  }

  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}
