/**
 * Seeds the central marketplace DB from `lib/mocks/horeca.ts` (starter catalog).
 * Run after `pnpm db:push`.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

async function run() {
  const root = dirname(fileURLToPath(import.meta.url));
  await import(join(root, "../scripts/load-env.mjs"));

  const { db } = await import("../platform/db/client");
  const schema = await import("../platform/db/schema");
  const { hashPassword } = await import("../platform/lib/auth");
  const { parsePriceToNumber } = await import("../platform/lib/format");

  const {
    featuredProducts,
    recentOrders,
    suppliers: mockSuppliers,
  } = await import("../lib/mocks/horeca");

  const { users, suppliers, products, orders } = schema;

  function mockAvailabilityToDb(label: string): "immediate" | "limited" {
    return label === "Περιορισμένο" ? "limited" : "immediate";
  }

  function mockOrderStatusToDb(label: string): "new" | "processing" | "in_transit" | "completed" {
    if (label.includes("Ολοκληρώθηκε")) return "completed";
    if (label.includes("οδόν")) return "in_transit";
    if (label.includes("επεξεργασία")) return "processing";
    return "new";
  }

  function parseTotalToDecimal(s: string): string {
    return parsePriceToNumber(s.replace("€", "").trim());
  }

  console.log("[seed] clearing tables…");
  await db.delete(orders);
  await db.delete(products);
  await db.delete(suppliers);
  await db.delete(users);

  console.log("[seed] users…");
  const buyerHash = await hashPassword("demo1234");
  const supplierHash = await hashPassword("demo1234");
  const [buyer] = await db
    .insert(users)
    .values({
      email: "buyer@horeca.demo",
      passwordHash: buyerHash,
      name: "Demo Coffee Shop",
      role: "buyer",
    })
    .returning();
  const [supplierUser] = await db
    .insert(users)
    .values({
      email: "supplier@horeca.demo",
      passwordHash: supplierHash,
      name: "Aegean Coffee Trade",
      role: "supplier",
    })
    .returning();

  if (!buyer || !supplierUser) throw new Error("Failed to insert seed users");

  console.log("[seed] suppliers & products…");
  for (const s of mockSuppliers) {
    const [row] = await db
      .insert(suppliers)
      .values({
        name: s.name,
        category: s.category,
        location: s.location,
        rating: Math.round(s.rating * 10),
        deliveryTime: s.deliveryTime,
        minimumOrder: s.minimumOrder,
        verified: s.verified,
        highlight: s.highlight,
        ownerUserId: s.name === "Aegean Coffee Trade" ? supplierUser.id : null,
      })
      .returning();
    if (!row) continue;
    const sid = row.id;
    const prods = featuredProducts.filter((p) => p.supplierId === s.id);
    for (const p of prods) {
      await db.insert(products).values({
        supplierId: sid,
        name: p.name,
        description: null,
        unit: p.unit,
        priceEur: parsePriceToNumber(p.price),
        availability: mockAvailabilityToDb(p.availability),
        category: p.category,
      });
    }
  }

  const supplierRows = await db.select().from(suppliers);
  const nameToId = new Map(supplierRows.map((r) => [r.name, r.id]));

  console.log("[seed] demo orders for buyer…");
  for (const o of recentOrders) {
    const sid = nameToId.get(o.supplierName);
    if (!sid) continue;
    await db.insert(orders).values({
      publicId: o.id,
      buyerId: buyer.id,
      supplierId: sid,
      status: mockOrderStatusToDb(o.status),
      totalEur: parseTotalToDecimal(o.total),
      itemCount: o.itemCount,
      deliveryWindow: o.deliveryWindow,
    });
  }

  console.log("[seed] done. buyer@horeca.demo / demo1234 | supplier@horeca.demo / demo1234");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
