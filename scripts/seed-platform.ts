/**
 * Seeds the central marketplace DB from `lib/mocks/horeca.ts` (starter catalog).
 * Run after `pnpm db:push`.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

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

  const {
    users,
    suppliers,
    products,
    orders,
    orderItems,
    subscriptions,
    favorites,
    cartItems,
    priceAlerts,
    locations,
    locationMembers,
    locationInvites,
    priceAlertHits,
    userPushTokens,
  } = schema;

  function mockAvailabilityToDb(label: string): "immediate" | "limited" {
    return label === "Περιορισμένο" ? "limited" : "immediate";
  }

  function mockOrderStatusToDb(label: string): "new" | "processing" | "in_transit" | "completed" {
    if (label.includes("Ολοκληρώθηκε")) return "completed";
    if (label.includes("οδόν")) return "in_transit";
    if (label.includes("επεξεργασία")) return "processing";
    return "new";
  }

  console.log("[seed] clearing tables…");
  // Order matters: dependents (cart_items, favorites) πρέπει να κατέβουν πριν
  // products/suppliers ώστε το wipe να μην σκάει σε FK αν το dev DB έχει data.
  // orderItems → orders πρώτα (ίδια λογική με πριν).
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(priceAlertHits);
  await db.delete(priceAlerts);
  await db.delete(cartItems);
  await db.delete(favorites);
  await db.delete(locationInvites);
  await db.delete(locationMembers);
  await db.delete(locations);
  await db.delete(products);
  await db.delete(suppliers);
  await db.delete(subscriptions);
  await db.delete(userPushTokens);
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

  console.log("[seed] default buyer location…");
  const [buyerDefaultLocation] = await db
    .insert(locations)
    .values({
      ownerUserId: buyer.id,
      name: "Κύριο κατάστημα",
      address: "",
    })
    .returning();
  if (!buyerDefaultLocation) throw new Error("Failed to insert demo buyer location");
  await db.insert(locationMembers).values({
    locationId: buyerDefaultLocation.id,
    userId: buyer.id,
    role: "owner",
  });

  console.log("[seed] subscriptions (buyer=free, supplier=free)…");
  // Όλοι ξεκινούν στο free plan. Το dev-only activate endpoint (βλ.
  // /api/dev/subscription/activate) ανεβάζει σε pro όταν θέλουμε να δείξουμε
  // gated features σε demo.
  await db.insert(subscriptions).values([
    { userId: buyer.id, plan: "free", status: "active" },
    { userId: supplierUser.id, plan: "free", status: "active" },
  ]);

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
        latitude: s.latitude ?? null,
        longitude: s.longitude ?? null,
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

  console.log("[seed] demo orders for buyer (with line items)…");
  for (const o of recentOrders) {
    const sid = nameToId.get(o.supplierName);
    if (!sid) continue;

    // Πιάνουμε όλα τα προϊόντα του supplier ώστε να φτιάξουμε realistic
    // line items. Παίρνουμε τα πρώτα 3 (ή λιγότερα αν δεν υπάρχουν), και
    // μοιράζουμε το itemCount ομοιόμορφα. Έτσι το order-detail screen θα
    // δείχνει αληθινά προϊόντα για το demo αντί για άδεια λίστα.
    const supplierProducts = await db
      .select()
      .from(products)
      .where(eq(products.supplierId, sid));
    if (supplierProducts.length === 0) continue;

    const numLines = Math.min(supplierProducts.length, 3);
    const baseQty = Math.max(1, Math.floor(o.itemCount / numLines));
    const remainder = o.itemCount - baseQty * numLines;
    const lines = supplierProducts.slice(0, numLines).map((p, idx) => ({
      p,
      qty: baseQty + (idx === 0 ? remainder : 0),
    }));

    // Το total υπολογίζεται από τις πραγματικές τιμές προϊόντων ώστε το
    // order summary να ταιριάζει με τα displayed line items. Αγνοούμε το
    // mock total του recentOrders — εδώ προτεραιότητα έχει η συνέπεια.
    const total = lines.reduce(
      (acc, { p, qty }) => acc + Number(p.priceEur) * qty,
      0,
    );
    const realItemCount = lines.reduce((acc, l) => acc + l.qty, 0);

    const [orderRow] = await db
      .insert(orders)
      .values({
        publicId: o.id,
        buyerId: buyer.id,
        supplierId: sid,
        locationId: buyerDefaultLocation.id,
        status: mockOrderStatusToDb(o.status),
        totalEur: total.toFixed(2),
        itemCount: realItemCount,
        deliveryWindow: o.deliveryWindow,
      })
      .returning();
    if (!orderRow) continue;

    for (const { p, qty } of lines) {
      const lineTotal = Number(p.priceEur) * qty;
      await db.insert(orderItems).values({
        orderId: orderRow.id,
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        unitPriceEur: p.priceEur,
        qty,
        lineTotalEur: lineTotal.toFixed(2),
      });
    }
  }

  console.log("[seed] done. buyer@horeca.demo / demo1234 | supplier@horeca.demo / demo1234");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
