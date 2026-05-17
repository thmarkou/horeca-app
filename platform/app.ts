import { randomUUID } from "node:crypto";

import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { db } from "./db/client";
import {
  cartItems,
  favorites,
  locationInvites,
  locationMembers,
  locations,
  orderItems,
  orders,
  priceAlerts,
  products,
  subscriptions,
  suppliers,
  userPushTokens,
  users,
} from "./db/schema";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./lib/auth";
import { aggregateBuyerSpending, type SpendingMonthsOption } from "./lib/buyer-spending";
import { formatAvailability, formatEur, formatOrderStatus } from "./lib/format";

/** ISO των `orders.created_at` για ιστορικό UI (τελευταίες N μέρες). */
function orderCreatedAtMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    if (Number.isFinite(t)) return t;
  }
  return Date.now();
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "horeca-platform" }));

app.post("/api/auth/logout", (c) => c.newResponse(null, 204));

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["buyer", "supplier"]).optional(),
});

/**
 * Default storefront values για νέους suppliers. Ο skeleton είναι ορατός
 * αμέσως μετά το register ώστε ο supplier να μπορεί να ξεκινήσει να δέχεται
 * παραγγελίες (μετά το Phase 0.7 που θα προσθέσει profile edit + προϊόντα).
 *
 * Αρχές επιλογής defaults:
 * - **Honest signals**: rating=0 και verified=false λένε αληθινά «αυτός είναι
 *   νέος προμηθευτής, δεν έχει review/verification ιστορικό».
 * - **Άκυρα-αλλά-όχι-spammy placeholders**: τα `Λοιπά / Δεν έχει οριστεί`
 *   κάνουν visible ότι λείπει info, χωρίς να σπάνε το catalog UI που
 *   περιμένει non-null strings.
 * - **Single source of truth**: όλα τα fields εδώ — αν το Phase 0.7
 *   προσθέσει νέο column, αυτό το object είναι το ένα σημείο που πρέπει να
 *   ενημερωθεί.
 */
const NEW_SUPPLIER_DEFAULTS = {
  category: "\u039b\u03bf\u03b9\u03c0\u03ac", // Λοιπά
  location: "\u0394\u03b5\u03bd \u03ad\u03c7\u03b5\u03b9 \u03bf\u03c1\u03b9\u03c3\u03c4\u03b5\u03af", // Δεν έχει οριστεί
  deliveryTime: "\u0395\u03c0\u03b9\u03ba\u03bf\u03b9\u03bd\u03c9\u03bd\u03af\u03b1", // Επικοινωνία
  minimumOrder: "\u03a7\u03c9\u03c1\u03af\u03c2 \u03b5\u03bb\u03ac\u03c7\u03b9\u03c3\u03c4\u03bf", // Χωρίς ελάχιστο
  highlight:
    "\u039d\u03ad\u03bf\u03c2 \u03c0\u03c1\u03bf\u03bc\u03b7\u03b8\u03b5\u03c5\u03c4\u03ae\u03c2 \u03c3\u03c4\u03b7\u03bd \u03c0\u03bb\u03b1\u03c4\u03c6\u03cc\u03c1\u03bc\u03b1.", // Νέος προμηθευτής στην πλατφόρμα.
} as const;

/** Προκαθορισμένο όνομα 1ου καταστήματος buyer (Φάση 3.1) — συγχρονίζεται με seed. */
const DEFAULT_BUYER_LOCATION_NAME = "\u039a\u03cd\u03c1\u03b9\u03bf \u03ba\u03b1\u03c4\u03ac\u03c3\u03c4\u03b7\u03bc\u03b1"; // Κύριο κατάστημα

app.post("/api/auth/register", async (c) => {
  const parsed = registerBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "Valid email, password (8+ chars), and name are required." }, 400);
  }
  const { email, password, name, role: roleIn } = parsed.data;
  const role = roleIn ?? "buyer";
  const normalized = email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (existing.length) {
    return c.json({ error: "An account with this email already exists" }, 409);
  }
  const passwordHash = await hashPassword(password);

  // Transactional create: user + subscription (+ optional supplier storefront).
  // Αν σπάσει οποιοδήποτε βήμα, κανένα από τα δύο/τρία records δεν θα μείνει
  // ορφανό. Πιο πριν τα 2 inserts γινόντουσαν εκτός transaction· δεν είχε
  // ποτέ ορατό bug αλλά είναι σωστότερο data integrity-wise.
  const result = await db.transaction(async (tx) => {
    const [userRow] = await tx
      .insert(users)
      .values({ email: normalized, passwordHash, name: name.trim(), role })
      .returning();
    if (!userRow) throw new Error("Failed to insert user");

    // Auto-enroll σε free plan ώστε κάθε authenticated user να έχει πάντα
    // subscription record. Το UI μετά διαβάζει απλά το plan/status.
    await tx
      .insert(subscriptions)
      .values({ userId: userRow.id, plan: "free", status: "active" });

    // Φάση 3.1: κάθε νέος buyer παίρνει προεπιλεγμένο κατάστημα για παραγγελίες.
    if (userRow.role === "buyer") {
      const [loc] = await tx
        .insert(locations)
        .values({
          ownerUserId: userRow.id,
          name: DEFAULT_BUYER_LOCATION_NAME,
          address: "",
        })
        .returning();
      if (loc) {
        await tx.insert(locationMembers).values({
          locationId: loc.id,
          userId: userRow.id,
          role: "owner",
        });
      }
    }

    // Phase 0.6: auto-create storefront για suppliers. Έτσι κάθε supplier
    // user έχει αμέσως ένα row στο `suppliers` table που τον δηλώνει ως
    // owner — απαραίτητο για τα role-aware queries (orders/recent,
    // supplier-operational-summary) που φιλτράρουν με `ownerUserId`.
    let supplierRow: typeof suppliers.$inferSelect | null = null;
    if (userRow.role === "supplier") {
      [supplierRow] = await tx
        .insert(suppliers)
        .values({
          name: userRow.name,
          category: NEW_SUPPLIER_DEFAULTS.category,
          location: NEW_SUPPLIER_DEFAULTS.location,
          rating: 0,
          deliveryTime: NEW_SUPPLIER_DEFAULTS.deliveryTime,
          minimumOrder: NEW_SUPPLIER_DEFAULTS.minimumOrder,
          verified: false,
          highlight: NEW_SUPPLIER_DEFAULTS.highlight,
          ownerUserId: userRow.id,
        })
        .returning();
    }

    return { userRow, supplierRow };
  });

  const token = await signToken(result.userRow.id, result.userRow.email, result.userRow.role);
  return c.json({
    app_session_id: token,
    user: {
      id: result.userRow.id,
      openId: `user:${result.userRow.id}`,
      name: result.userRow.name,
      email: result.userRow.email,
      role: result.userRow.role,
      loginMethod: "email",
      lastSignedIn: new Date().toISOString(),
    },
    // Optional — null για buyers. Επιτρέπει στον client να ξέρει το storefront id
    // αμέσως μετά register χωρίς extra round-trip.
    supplier: result.supplierRow ? mapSupplierRow(result.supplierRow) : null,
  });
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

app.post("/api/auth/login", async (c) => {
  const parsed = loginBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "Valid email and password are required." }, 400);
  }
  const { email, password } = parsed.data;
  const normalized = email.trim().toLowerCase();
  const [row] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (!row) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const token = await signToken(row.id, row.email, row.role);
  return c.json({
    app_session_id: token,
    user: {
      id: row.id,
      openId: `user:${row.id}`,
      name: row.name,
      email: row.email,
      role: row.role,
      loginMethod: "email",
      lastSignedIn: new Date().toISOString(),
    },
  });
});

async function getAuthUserId(c: Context) {
  const h = c.req.header("Authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m?.[1]) return null;
  const payload = await verifyToken(m[1].trim());
  if (!payload) return null;
  const id = Number(payload.sub);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

app.get("/api/auth/me", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ user: null }, 200);
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return c.json({ user: null }, 200);
  return c.json({
    user: {
      id: row.id,
      openId: `user:${row.id}`,
      name: row.name,
      email: row.email,
      role: row.role,
      loginMethod: "email",
      lastSignedIn: new Date().toISOString(),
    },
  });
});

function mapSupplierRow(s: typeof suppliers.$inferSelect) {
  return {
    id: String(s.id),
    name: s.name,
    category: s.category,
    location: s.location,
    rating: s.rating / 10,
    deliveryTime: s.deliveryTime,
    minimumOrder: s.minimumOrder,
    verified: s.verified,
    highlight: s.highlight,
    // Έχει συμπληρωθεί το profile; — proxy signal: ο supplier έχει αλλάξει το
    // tagline από το Phase 0.6 default. Είναι το πιο «δηλωτικό» πεδίο που
    // ένας νέος supplier θα προσαρμόσει πρώτο, οπότε δείχνει αξιόπιστα αν
    // έχει επενδύσει χρόνο στο storefront. Το UI το χρησιμοποιεί για να
    // δείξει «Νέος» pill ή να αποκρύψει placeholder tagline.
    isOnboarded: s.highlight !== NEW_SUPPLIER_DEFAULTS.highlight,
    // Παραλείπουμε τα πεδία αν είναι null ώστε το client type (optional) να
    // παραμένει μη-undefined accidentally — διατηρούμε wire contract καθαρό.
    ...(s.latitude !== null && s.longitude !== null
      ? { latitude: s.latitude, longitude: s.longitude }
      : {}),
  };
}

function mapProductRow(p: typeof products.$inferSelect) {
  // Εκθέτουμε ΚΑΙ formatted `price` (για άμεση εμφάνιση) ΚΑΙ raw `priceEur`
  // (number) ώστε ο client να μπορεί να κάνει cart math χωρίς να ξανα-parse-ει
  // localized strings ("18,90 €"). Αυτό κρατά το display vs math contract
  // καθαρό και είναι locale-safe για μελλοντικό i18n.
  return {
    id: String(p.id),
    supplierId: String(p.supplierId),
    name: p.name,
    unit: p.unit,
    price: formatEur(p.priceEur),
    priceEur: Number(p.priceEur),
    availability: formatAvailability(p.availability),
    category: p.category,
  };
}

app.get("/api/catalog/categories", async (c) => {
  const rows = await db
    .selectDistinct({ category: suppliers.category })
    .from(suppliers)
    .orderBy(asc(suppliers.category));
  return c.json({ categories: rows.map((r) => r.category) });
});

app.get("/api/catalog/suppliers", async (c) => {
  const category = c.req.query("category");
  const list = category
    ? await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.category, category))
        .orderBy(asc(suppliers.name))
    : await db.select().from(suppliers).orderBy(asc(suppliers.name));
  return c.json({ suppliers: list.map(mapSupplierRow) });
});

app.get("/api/catalog/suppliers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid id" }, 400);
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  if (!row) return c.json({ supplier: null });
  return c.json({ supplier: mapSupplierRow(row) });
});

app.get("/api/catalog/suppliers/:id/products", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid id" }, 400);
  const list = await db
    .select()
    .from(products)
    .where(eq(products.supplierId, id))
    .orderBy(asc(products.name));
  return c.json({ products: list.map(mapProductRow) });
});

app.get("/api/catalog/products/featured", async (c) => {
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 10));
  const list = await db.select().from(products).orderBy(asc(products.id)).limit(limit);
  return c.json({ products: list.map(mapProductRow) });
});

app.get("/api/catalog/products/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid id" }, 400);
  const [row] = await db
    .select({
      product: products,
      supplierName: suppliers.name,
    })
    .from(products)
    .innerJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(products.id, id))
    .limit(1);
  if (!row) return c.json({ product: null });
  const base = mapProductRow(row.product);
  return c.json({
    product: {
      ...base,
      description:
        row.product.description ??
        "\u039b\u03b5\u03c0\u03c4\u03bf\u03bc\u03ad\u03c1\u03b5\u03b9\u03b5\u03c2 \u03b1\u03c0\u03cc \u03c4\u03bf\u03bd \u03ba\u03b1\u03c4\u03ac\u03bb\u03bf\u03b3\u03bf \u03c4\u03bf\u03c5 \u03c0\u03c1\u03bf\u03bc\u03b7\u03b8\u03b5\u03c5\u03c4\u03ae.",
      supplierName: row.supplierName,
    },
  });
});

// ─── POST /api/orders — buyer δημιουργεί νέα παραγγελία ───────────────────
//
// Σχεδιαστικές αρχές:
// - **Zero-trust totals**: ο client στέλνει μόνο `productId + qty`. Οι τιμές
//   και τα ονόματα έρχονται από το DB — αν ο client στείλει «δικιά του» τιμή,
//   αγνοείται. Αυτό προστατεύει από κακόβουλο όσο και bug-induced mismatch
//   ανάμεσα σε cart cache και live catalog.
// - **Single supplier per order**: το cart UI ομαδοποιεί ήδη ανά supplier και
//   το checkout θα κάνει loop. Στο backend το enforce-άρουμε γιατί B2B orders
//   έχουν ξεχωριστά MOQ/delivery ανά supplier.
// - **Snapshot στο order_items**: κρατάμε productName/unit/unitPriceEur τη
//   στιγμή της παραγγελίας ώστε αν αλλάξει το product μελλοντικά (ή σβηστεί),
//   το ιστορικό να μένει intact για audit/dispute.

const createOrderItemBody = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().positive().max(9999),
});

const createOrderBody = z.object({
  supplierId: z.number().int().positive(),
  items: z.array(createOrderItemBody).min(1).max(50),
  deliveryWindow: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  /** Φάση 3.1: ποιο κατάστημα χρεώνεται — υποχρεωτικό αν ο buyer ανήκει σε location. */
  locationId: z.number().int().positive().optional(),
});

const DEFAULT_DELIVERY_WINDOW = "\u03a3\u03c5\u03bd\u03c4\u03bf\u03bd\u03b9\u03c3\u03bc\u03cc\u03c2 \u03bc\u03b5 \u03c4\u03bf\u03bd \u03c0\u03c1\u03bf\u03bc\u03b7\u03b8\u03b5\u03c5\u03c4\u03ae";

function generateOrderPublicId(): string {
  return `ord-${randomUUID().slice(0, 8)}`;
}

// ─── Order status state machine ──────────────────────────────────────────
//
// Όλες οι επιτρεπτές μεταβάσεις περιγράφονται **εδώ**, ώστε να μη μπορεί ο
// client να φτιάξει «κρυφές» transitions (πχ απευθείας new→completed χωρίς
// processing). Όποτε προσθέσουμε state, ενημερώνουμε ΜΟΝΟ αυτόν τον χάρτη.
//
// Σχεδιαστικές αρχές:
// - `completed` και `cancelled` είναι terminal — δεν επιστρέφουμε σε αυτές.
// - Επιτρέπουμε `processing → completed` (skip in_transit) γιατί στο current
//   MVP ο supplier πιθανώς δεν θα διαχωρίζει το «έφυγε» από το «παραδόθηκε»·
//   όταν προστεθεί logistics tracking, ο supplier UI θα προσφέρει σαφή
//   ενδιάμεσο βήμα μέσω in_transit.
// - `new → cancelled` = supplier reject. Σε μελλοντική φάση θα επιτρέψουμε
//   και `new → cancelled` από buyer ως «cancel order before acceptance».

type OrderStatus = "new" | "processing" | "in_transit" | "completed" | "cancelled";

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["processing", "cancelled"],
  processing: ["in_transit", "completed"],
  in_transit: ["completed"],
  completed: [],
  cancelled: [],
};

function isAllowedTransition(from: string, to: OrderStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from as OrderStatus];
  return allowed ? allowed.includes(to) : false;
}

async function isBuyerMemberOfLocation(buyerUserId: number, locationId: number): Promise<boolean> {
  const [row] = await db
    .select()
    .from(locationMembers)
    .where(and(eq(locationMembers.locationId, locationId), eq(locationMembers.userId, buyerUserId)))
    .limit(1);
  return Boolean(row);
}

app.post("/api/orders", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return c.json({ error: "User no longer exists" }, 401);
  if (u.role !== "buyer") {
    return c.json({ error: "Only buyers can place orders" }, 403);
  }

  // Φάση 2.1: free buyer hard cap ανά ημερολογιακό μήνα (server local TZ).
  const subscriptionRowEarly = await getOrCreateSubscription(userId);
  if (!subscriptionRowEarly) return c.json({ error: "User no longer exists" }, 401);
  const billingEarly = mapSubscriptionRow(subscriptionRowEarly);
  if (!billingEarly.isPro) {
    const usedThisMonth = await countBuyerOrdersSinceMonthStart(userId);
    if (usedThisMonth >= FREE_BUYER_MONTHLY_ORDER_LIMIT) {
      return c.json(
        { error: "monthly_limit_reached", limit: FREE_BUYER_MONTHLY_ORDER_LIMIT },
        402,
      );
    }
  }

  const parsed = createOrderBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }
  const { supplierId, items: itemsIn, deliveryWindow, notes, locationId: locationIdIn } = parsed.data;

  let resolvedLocationId: number | null = null;
  if (locationIdIn !== undefined) {
    const ok = await isBuyerMemberOfLocation(userId, locationIdIn);
    if (!ok) {
      return c.json({ error: "Forbidden or unknown location", code: "location_forbidden" }, 403);
    }
    resolvedLocationId = locationIdIn;
  }

  // Duplicate productIds δεν επιτρέπονται — ο client πρέπει να ομαδοποιεί
  // qty ανά μοναδικό προϊόν. Αυτό αποτρέπει «κρυφά» double rows στο order.
  const productIds = itemsIn.map((i) => i.productId);
  if (new Set(productIds).size !== productIds.length) {
    return c.json({ error: "Duplicate productId in items" }, 400);
  }

  const [supplierRow] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);
  if (!supplierRow) return c.json({ error: "Supplier not found" }, 404);

  // Μία batched query για όλα τα products που ζητήθηκαν — αποφεύγουμε N+1.
  const productRows = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));

  if (productRows.length !== productIds.length) {
    return c.json({ error: "One or more products not found" }, 404);
  }
  const wrongSupplier = productRows.find((p) => p.supplierId !== supplierId);
  if (wrongSupplier) {
    return c.json({ error: "Product does not belong to supplier" }, 400);
  }

  // Build lookup ώστε να μη ξανα-iterate-ουμε σε O(n²) στο reduce.
  const productById = new Map(productRows.map((p) => [p.id, p]));
  let totalEur = 0;
  let itemCount = 0;
  const linesToInsert: {
    productId: number;
    productName: string;
    unit: string;
    unitPriceEur: string;
    qty: number;
    lineTotalEur: string;
  }[] = [];
  for (const { productId, qty } of itemsIn) {
    const p = productById.get(productId);
    if (!p) {
      // Theoretically unreachable μετά τους ελέγχους παραπάνω, αλλά κρατάμε
      // type-safe access χωρίς non-null assertion.
      return c.json({ error: "Product disappeared mid-request" }, 500);
    }
    const unitPrice = Number(p.priceEur);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return c.json({ error: `Invalid price for product ${p.id}` }, 500);
    }
    const lineTotal = unitPrice * qty;
    totalEur += lineTotal;
    itemCount += qty;
    linesToInsert.push({
      productId: p.id,
      productName: p.name,
      unit: p.unit,
      unitPriceEur: p.priceEur,
      qty,
      lineTotalEur: lineTotal.toFixed(2),
    });
  }

  const publicId = generateOrderPublicId();
  const window = deliveryWindow?.trim() || DEFAULT_DELIVERY_WINDOW;

  // libSQL/Drizzle transaction: αν σπάσει το items insert, ο order δε
  // δημιουργείται. Δεν αφήνουμε «φάντασμα» orders χωρίς γραμμές.
  const result = await db.transaction(async (tx) => {
    const [orderRow] = await tx
      .insert(orders)
      .values({
        publicId,
        buyerId: userId,
        supplierId,
        locationId: resolvedLocationId,
        status: "new",
        totalEur: totalEur.toFixed(2),
        itemCount,
        deliveryWindow: window,
        notes: notes ?? null,
      })
      .returning();
    if (!orderRow) throw new Error("Order insert returned no row");

    const itemRows = await tx
      .insert(orderItems)
      .values(linesToInsert.map((l) => ({ ...l, orderId: orderRow.id })))
      .returning();

    return { orderRow, itemRows };
  });

  return c.json(
    {
      order: {
        id: result.orderRow.publicId,
        publicId: result.orderRow.publicId,
        supplierId: String(supplierRow.id),
        supplierName: supplierRow.name,
        counterpartyName: supplierRow.name,
        // POST γίνεται πάντα από buyer (role guard παραπάνω) — explicit ώστε
        // το client να μπορεί να βασιστεί στο ίδιο shape με GET/PATCH.
        viewerRole: "buyer" as const,
        status: formatOrderStatus(result.orderRow.status),
        total: formatEur(result.orderRow.totalEur),
        totalEur: Number(result.orderRow.totalEur),
        itemCount: result.orderRow.itemCount,
        deliveryWindow: result.orderRow.deliveryWindow,
        notes: result.orderRow.notes,
        locationId: result.orderRow.locationId != null ? String(result.orderRow.locationId) : undefined,
        createdAt: orderCreatedAtMs(result.orderRow.createdAt),
        items: result.itemRows.map((it) => ({
          id: String(it.id),
          productId: String(it.productId),
          productName: it.productName,
          unit: it.unit,
          qty: it.qty,
          unitPrice: formatEur(it.unitPriceEur),
          unitPriceEur: Number(it.unitPriceEur),
          lineTotal: formatEur(it.lineTotalEur),
          lineTotalEur: Number(it.lineTotalEur),
        })),
      },
    },
    201,
  );
});

app.get("/api/orders/recent", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return c.json({ orders: [] });

  // Role-aware isolation: buyers see orders they placed; suppliers see orders
  // placed against the supplier storefront they own. `counterpartyName` is the
  // other party's name — for buyers that's the supplier, for suppliers that's
  // the buyer (the shop that placed the order).
  if (u.role === "supplier") {
    const [listing] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.ownerUserId, userId))
      .limit(1);
    if (!listing) return c.json({ orders: [] });

    const rows = await db
      .select({
        order: orders,
        supplierName: suppliers.name,
        buyerName: users.name,
      })
      .from(orders)
      .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
      .innerJoin(users, eq(orders.buyerId, users.id))
      .where(eq(orders.supplierId, listing.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return c.json({
      orders: rows.map(({ order, supplierName, buyerName }) => ({
        id: order.publicId,
        supplierName,
        counterpartyName: buyerName,
        status: formatOrderStatus(order.status),
        total: formatEur(order.totalEur),
        itemCount: order.itemCount,
        deliveryWindow: order.deliveryWindow,
        createdAt: orderCreatedAtMs(order.createdAt),
      })),
    });
  }

  const lidRaw = c.req.query("locationId");
  let buyerFilter = eq(orders.buyerId, userId);
  if (lidRaw !== undefined && lidRaw !== "") {
    const lid = Number(lidRaw);
    if (Number.isFinite(lid) && lid >= 1) {
      buyerFilter = and(buyerFilter, eq(orders.locationId, lid))!;
    }
  }

  const rows = await db
    .select({
      order: orders,
      supplierName: suppliers.name,
    })
    .from(orders)
    .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
    .where(buyerFilter)
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return c.json({
    orders: rows.map(({ order, supplierName }) => ({
      id: order.publicId,
      supplierName,
      counterpartyName: supplierName,
      status: formatOrderStatus(order.status),
      total: formatEur(order.totalEur),
      itemCount: order.itemCount,
      deliveryWindow: order.deliveryWindow,
      ...(order.locationId != null ? { locationId: String(order.locationId) } : {}),
      createdAt: orderCreatedAtMs(order.createdAt),
    })),
  });
});

// ─── GET /api/orders/:publicId — order detail με items ────────────────────
//
// Role-aware authorization: ο buyer βλέπει μόνο τις δικές του παραγγελίες,
// ο supplier μόνο εκείνες που έγιναν στο storefront του. Αν δεν επιτρέπεται
// επιστρέφουμε 404 (όχι 403) ώστε να μη διαρρέει πληροφορία ύπαρξης
// παραγγελιών άλλων χρηστών (enumeration protection για τα predictable
// `ord-xxxxxxxx` ids).
app.get("/api/orders/:publicId", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const publicId = c.req.param("publicId");
  if (!publicId) return c.json({ error: "Order not found" }, 404);

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return c.json({ error: "Order not found" }, 404);

  const [row] = await db
    .select({
      order: orders,
      supplierName: suppliers.name,
      supplierOwnerUserId: suppliers.ownerUserId,
      buyerName: users.name,
    })
    .from(orders)
    .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(eq(orders.publicId, publicId))
    .limit(1);

  if (!row) return c.json({ error: "Order not found" }, 404);

  // Role-based isolation — δες σχόλιο πάνω για 404 vs 403.
  const isBuyerOwner = u.role === "buyer" && row.order.buyerId === userId;
  const isSupplierOwner = u.role === "supplier" && row.supplierOwnerUserId === userId;
  if (!isBuyerOwner && !isSupplierOwner) {
    return c.json({ error: "Order not found" }, 404);
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, row.order.id))
    .orderBy(asc(orderItems.id));

  return c.json({
    order: {
      id: row.order.publicId,
      publicId: row.order.publicId,
      supplierId: String(row.order.supplierId),
      supplierName: row.supplierName,
      // Όπως και στο /recent: counterpartyName είναι «η άλλη πλευρά»
      // ώστε η UI να μένει role-agnostic. Στον buyer δείχνει supplier,
      // στον supplier δείχνει shop.
      counterpartyName: u.role === "supplier" ? row.buyerName : row.supplierName,
      // Ο client χρησιμοποιεί το viewerRole για να αποφασίσει ποια
      // CTA buttons θα ρενταρίσει (supplier actions vs buyer reorder).
      viewerRole: u.role,
      status: formatOrderStatus(row.order.status),
      total: formatEur(row.order.totalEur),
      totalEur: Number(row.order.totalEur),
      itemCount: row.order.itemCount,
      deliveryWindow: row.order.deliveryWindow,
      notes: row.order.notes,
      createdAt: orderCreatedAtMs(row.order.createdAt),
      ...(row.order.locationId != null ? { locationId: String(row.order.locationId) } : {}),
      items: items.map((it) => ({
        id: String(it.id),
        productId: String(it.productId),
        productName: it.productName,
        unit: it.unit,
        qty: it.qty,
        unitPrice: formatEur(it.unitPriceEur),
        unitPriceEur: Number(it.unitPriceEur),
        lineTotal: formatEur(it.lineTotalEur),
        lineTotalEur: Number(it.lineTotalEur),
      })),
    },
  });
});

// ─── PATCH /api/orders/:publicId — status transitions ────────────────────
//
// Single source of truth για state machine: το `ALLOWED_STATUS_TRANSITIONS`
// πιο πάνω. Ο client στέλνει μόνο το επόμενο status, το backend ελέγχει αν
// επιτρέπεται από το current state και αν ο user έχει δικαίωμα.
//
// Authorization rules (MVP):
// - Supplier owner του storefront → όλες οι επιτρεπτές transitions
// - Buyer → δεν έχει transitions ακόμη (μελλοντικά: new → cancelled δικό του)
// - Άλλος user → 404 (enumeration protection, ίδια λογική με GET)

const updateOrderStatusBody = z.object({
  status: z.enum(["processing", "in_transit", "completed", "cancelled"]),
});

app.patch("/api/orders/:publicId", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const publicId = c.req.param("publicId");
  if (!publicId) return c.json({ error: "Order not found" }, 404);

  const parsed = updateOrderStatusBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid body", issues: parsed.error.issues }, 400);
  }
  const nextStatus = parsed.data.status;

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return c.json({ error: "Order not found" }, 404);

  const [row] = await db
    .select({
      order: orders,
      supplierName: suppliers.name,
      supplierOwnerUserId: suppliers.ownerUserId,
      buyerName: users.name,
    })
    .from(orders)
    .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(eq(orders.publicId, publicId))
    .limit(1);

  if (!row) return c.json({ error: "Order not found" }, 404);

  // Μόνο ο supplier owner μπορεί να αλλάξει status στο MVP. Ο buyer ακόμη
  // δεν έχει δικαίωμα μετάβασης — επιστρέφουμε 404 για enumeration parity
  // με το GET endpoint (δεν αποκαλύπτουμε ότι η παραγγελία υπάρχει).
  const isSupplierOwner = u.role === "supplier" && row.supplierOwnerUserId === userId;
  if (!isSupplierOwner) {
    return c.json({ error: "Order not found" }, 404);
  }

  if (!isAllowedTransition(row.order.status, nextStatus)) {
    // 409 Conflict — η resource state δεν επιτρέπει αυτή τη μετάβαση. Ο client
    // μπορεί να έχει stale data· το response περιλαμβάνει το current status
    // ώστε το UI να ξανασυγχρονιστεί χωρίς extra round-trip.
    return c.json(
      {
        error: "Invalid status transition",
        currentStatus: formatOrderStatus(row.order.status),
        requestedStatus: formatOrderStatus(nextStatus),
      },
      409,
    );
  }

  await db
    .update(orders)
    .set({ status: nextStatus })
    .where(eq(orders.id, row.order.id));

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, row.order.id))
    .orderBy(asc(orderItems.id));

  return c.json({
    order: {
      id: row.order.publicId,
      publicId: row.order.publicId,
      supplierId: String(row.order.supplierId),
      supplierName: row.supplierName,
      counterpartyName: row.buyerName,
      viewerRole: "supplier" as const,
      status: formatOrderStatus(nextStatus),
      total: formatEur(row.order.totalEur),
      totalEur: Number(row.order.totalEur),
      itemCount: row.order.itemCount,
      deliveryWindow: row.order.deliveryWindow,
      notes: row.order.notes,
      createdAt: orderCreatedAtMs(row.order.createdAt),
      ...(row.order.locationId != null ? { locationId: String(row.order.locationId) } : {}),
      items: items.map((it) => ({
        id: String(it.id),
        productId: String(it.productId),
        productName: it.productName,
        unit: it.unit,
        qty: it.qty,
        unitPrice: formatEur(it.unitPriceEur),
        unitPriceEur: Number(it.unitPriceEur),
        lineTotal: formatEur(it.lineTotalEur),
        lineTotalEur: Number(it.lineTotalEur),
      })),
    },
  });
});

// Supplier's own product catalog. Returns the raw availability status as well
// as the display label so the client can render a toggle in later phases (C4b).
function mapSupplierProductRow(p: typeof products.$inferSelect) {
  const status: "immediate" | "limited" = p.availability === "limited" ? "limited" : "immediate";
  return {
    id: String(p.id),
    name: p.name,
    description: p.description,
    unit: p.unit,
    price: formatEur(p.priceEur),
    priceEur: p.priceEur,
    availability: formatAvailability(p.availability),
    availabilityStatus: status,
    category: p.category,
  };
}

app.get("/api/supplier/products", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "supplier") {
    return c.json({ error: "Supplier role required" }, 403);
  }
  const [listing] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.ownerUserId, userId))
    .limit(1);
  if (!listing) {
    return c.json({ supplierId: null, supplierName: null, products: [] });
  }
  const list = await db
    .select()
    .from(products)
    .where(eq(products.supplierId, listing.id))
    .orderBy(asc(products.name));
  return c.json({
    supplierId: String(listing.id),
    supplierName: listing.name,
    products: list.map(mapSupplierProductRow),
  });
});

const availabilityBody = z.object({
  availability: z.enum(["immediate", "limited"]),
});

// Shared validation primitives για τα CRUD endpoints. Τα ίδια όρια ισχύουν
// σε create & update ώστε να μην αποκλίνουν τα error messages.
const productNameField = z.string().trim().min(1).max(120);
const productUnitField = z.string().trim().min(1).max(40);
const productCategoryField = z.string().trim().min(1).max(40);
// priceEur ως decimal string με μέχρι 2 δεκαδικά — ταιριάζει με το schema
// (`products.priceEur` text) και με το formatter του client.
const productPriceField = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, {
  message: "Τιμή σε μορφή 19.90",
});
const productDescriptionField = z.string().trim().max(500).nullable();
const productAvailabilityField = z.enum(["immediate", "limited"]);

const createProductBody = z.object({
  name: productNameField,
  unit: productUnitField,
  category: productCategoryField,
  priceEur: productPriceField,
  description: productDescriptionField.optional(),
  availability: productAvailabilityField.default("immediate"),
});

const updateProductBody = z
  .object({
    name: productNameField.optional(),
    unit: productUnitField.optional(),
    category: productCategoryField.optional(),
    priceEur: productPriceField.optional(),
    description: productDescriptionField.optional(),
    availability: productAvailabilityField.optional(),
  })
  .refine((val) => Object.values(val).some((v) => v !== undefined), {
    message: "At least one field is required",
  });

/**
 * Auth + supplier-storefront resolver για τα supplier-only product endpoints.
 * Discriminated union ώστε τα handlers να γράφονται σαν γραμμική ροή με
 * σωστό TS narrowing (`if (!auth.ok) return auth.response`).
 */
type StorefrontAuth =
  | { ok: true; listing: typeof suppliers.$inferSelect }
  | { ok: false; response: Response };

async function requireSupplierStorefront(c: Context): Promise<StorefrontAuth> {
  const userId = await getAuthUserId(c);
  if (!userId) return { ok: false, response: c.json({ error: "Unauthorized" }, 401) };
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "supplier") {
    return { ok: false, response: c.json({ error: "Supplier role required" }, 403) };
  }
  const [listing] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.ownerUserId, userId))
    .limit(1);
  if (!listing) {
    return {
      ok: false,
      response: c.json({ error: "No storefront linked to this supplier" }, 404),
    };
  }
  return { ok: true, listing };
}

// ─── Supplier profile (storefront) — view + edit ────────────────────────
//
// Ο supplier ξεκινά μετά το register με placeholder values (Φάση 0.6) και
// εδώ τα συμπληρώνει. Όλα τα editable fields είναι free-form strings — η
// κατηγορία επιλέγεται client-side από `/api/catalog/categories` ή νέα,
// γιατί το `suppliers.category` δεν είναι κλειδωμένο σε enum (επιτρέπει
// επέκταση χωρίς schema change).
//
// **Read-only fields** (όχι editable από supplier):
// - `id`, `ownerUserId` → identity
// - `rating` → derived από reviews (μελλοντικό feature)
// - `verified` → admin gate
// - `latitude/longitude` → χρειάζονται geocoding/map picker (Phase 1+)

const supplierProfileName = z.string().trim().min(1).max(120);
const supplierProfileCategory = z.string().trim().min(1).max(40);
const supplierProfileLocation = z.string().trim().min(1).max(120);
const supplierProfileDeliveryTime = z.string().trim().min(1).max(60);
const supplierProfileMinimumOrder = z.string().trim().min(1).max(60);
const supplierProfileHighlight = z.string().trim().min(1).max(160);

const updateSupplierProfileBody = z
  .object({
    name: supplierProfileName.optional(),
    category: supplierProfileCategory.optional(),
    location: supplierProfileLocation.optional(),
    deliveryTime: supplierProfileDeliveryTime.optional(),
    minimumOrder: supplierProfileMinimumOrder.optional(),
    highlight: supplierProfileHighlight.optional(),
  })
  .refine((val) => Object.values(val).some((v) => v !== undefined), {
    message: "At least one field is required",
  });

app.get("/api/supplier/profile", async (c) => {
  const auth = await requireSupplierStorefront(c);
  if (!auth.ok) return auth.response;
  return c.json({ supplier: mapSupplierRow(auth.listing) });
});

app.patch("/api/supplier/profile", async (c) => {
  const auth = await requireSupplierStorefront(c);
  if (!auth.ok) return auth.response;

  const parsed = updateSupplierProfileBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid body", issues: parsed.error.issues }, 400);
  }
  const patch = parsed.data;

  // Drizzle ορίζει τα undefined values να αγνοούνται στο .set, ώστε partial
  // updates δεν χρειάζονται μη χρειαζούμενη αναπαραγωγή των unchanged fields.
  const [updated] = await db
    .update(suppliers)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.deliveryTime !== undefined ? { deliveryTime: patch.deliveryTime } : {}),
      ...(patch.minimumOrder !== undefined ? { minimumOrder: patch.minimumOrder } : {}),
      ...(patch.highlight !== undefined ? { highlight: patch.highlight } : {}),
    })
    .where(eq(suppliers.id, auth.listing.id))
    .returning();

  if (!updated) {
    return c.json({ error: "Failed to update profile" }, 500);
  }
  return c.json({ supplier: mapSupplierRow(updated) });
});

app.post("/api/supplier/products", async (c) => {
  const auth = await requireSupplierStorefront(c);
  if (!auth.ok) return auth.response;

  const parsed = createProductBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  const [inserted] = await db
    .insert(products)
    .values({
      supplierId: auth.listing.id,
      name: parsed.data.name,
      unit: parsed.data.unit,
      category: parsed.data.category,
      priceEur: parsed.data.priceEur,
      availability: parsed.data.availability,
      description: parsed.data.description ?? null,
    })
    .returning();
  if (!inserted) return c.json({ error: "Could not create product" }, 500);

  return c.json({ product: mapSupplierProductRow(inserted) }, 201);
});

app.patch("/api/supplier/products/:id", async (c) => {
  const auth = await requireSupplierStorefront(c);
  if (!auth.ok) return auth.response;

  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid product id" }, 400);

  const parsed = updateProductBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  // Ownership guard — απαραίτητο πριν το update, ακριβώς όπως στο availability PATCH.
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing || existing.supplierId !== auth.listing.id) {
    return c.json({ error: "Product not found" }, 404);
  }

  const [updated] = await db
    .update(products)
    .set({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.unit !== undefined && { unit: parsed.data.unit }),
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.priceEur !== undefined && { priceEur: parsed.data.priceEur }),
      ...(parsed.data.availability !== undefined && { availability: parsed.data.availability }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
    })
    .where(eq(products.id, id))
    .returning();
  if (!updated) return c.json({ error: "Could not update product" }, 500);

  return c.json({ product: mapSupplierProductRow(updated) });
});

app.delete("/api/supplier/products/:id", async (c) => {
  const auth = await requireSupplierStorefront(c);
  if (!auth.ok) return auth.response;

  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid product id" }, 400);

  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing || existing.supplierId !== auth.listing.id) {
    return c.json({ error: "Product not found" }, 404);
  }

  await db.delete(products).where(eq(products.id, id));
  return c.body(null, 204);
});

app.patch("/api/supplier/products/:id/availability", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "supplier") {
    return c.json({ error: "Supplier role required" }, 403);
  }
  const [listing] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.ownerUserId, userId))
    .limit(1);
  if (!listing) return c.json({ error: "No storefront linked to this supplier" }, 404);

  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid product id" }, 400);

  const parsed = availabilityBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "availability must be 'immediate' or 'limited'" }, 400);
  }

  // Ownership guard: the product must belong to the supplier's own listing.
  // Prevents cross-tenant updates even if the caller guesses a product id.
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing || existing.supplierId !== listing.id) {
    return c.json({ error: "Product not found" }, 404);
  }

  const [updated] = await db
    .update(products)
    .set({ availability: parsed.data.availability })
    .where(eq(products.id, id))
    .returning();
  if (!updated) return c.json({ error: "Could not update product" }, 500);

  return c.json({ product: mapSupplierProductRow(updated) });
});

app.get("/api/supplier/operational-summary", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "supplier") {
    return c.json({ error: "Supplier role required" }, 403);
  }
  const [listing] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.ownerUserId, userId))
    .limit(1);
  if (!listing) {
    return c.json({
      newOrders: 0,
      processingOrders: 0,
      lowStockItems: 0,
      todayRevenue: formatEur(0),
    });
  }
  const sid = listing.id;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [[newOrders], [processingOrders], [lowStock], completedToday] = await Promise.all([
    db.select({ c: count() }).from(orders).where(and(eq(orders.supplierId, sid), eq(orders.status, "new"))),
    db
      .select({ c: count() })
      .from(orders)
      .where(and(eq(orders.supplierId, sid), eq(orders.status, "processing"))),
    db
      .select({ c: count() })
      .from(products)
      .where(and(eq(products.supplierId, sid), eq(products.availability, "limited"))),
    db
      .select({ totalEur: orders.totalEur })
      .from(orders)
      .where(
        and(
          eq(orders.supplierId, sid),
          eq(orders.status, "completed"),
          gte(orders.createdAt, startOfDay),
        ),
      ),
  ]);

  const revenue = completedToday.reduce((acc, row) => acc + Number(row.totalEur), 0);

  return c.json({
    newOrders: Number(newOrders?.c ?? 0),
    processingOrders: Number(processingOrders?.c ?? 0),
    lowStockItems: Number(lowStock?.c ?? 0),
    todayRevenue: formatEur(revenue),
  });
});

// ─── Subscription (buyer-funded, 2 tiers: free + pro) ──────────────────────
//
// Το plan είναι source of truth για feature gating. Όταν μπει RevenueCat /
// StoreKit, το activate/cancel θα καλείται από webhook αντί για dev endpoint —
// ο client contract (`GET /api/me/subscription`) παραμένει σταθερός.

const SUBSCRIPTION_PLANS = ["free", "pro"] as const;
const SUBSCRIPTION_STATUSES = ["active", "canceled", "expired", "trialing"] as const;

type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Free-tier cap — sync με `FREE_FEATURES.maxOrdersPerMonth` στο `lib/subscription.ts`. */
const FREE_BUYER_MONTHLY_ORDER_LIMIT = 10;

/** Free-tier favorites cap — sync με `FREE_FEATURES.maxSavedSuppliers` στο `lib/subscription.ts`. */
const FREE_BUYER_MAX_SAVED_SUPPLIERS = 3;

/** Sync με `FeatureSet.maxLocations` (`lib/subscription.ts`). */
const FREE_BUYER_MAX_LOCATIONS_CAP = 1;
/** Sync με Pro `FeatureSet.maxLocations`. */
const PRO_BUYER_MAX_LOCATIONS_CAP = 5;

/** Ο συνολικός αριθμός λογαριασμών (συμπ. ιδιοκτήτη) ανά κατάστημα · `maxTeamSeats`. */
const FREE_LOCATION_TEAM_CAP = 1;
const PRO_LOCATION_TEAM_CAP = 5;

function normalizeBuyerEmail(email: string) {
  return email.trim().toLowerCase();
}

function calendarMonthBoundsForUsage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const resetsAt = new Date(monthStart);
  resetsAt.setMonth(resetsAt.getMonth() + 1);
  return { monthStart, resetsAt };
}

async function countBuyerOrdersSinceMonthStart(buyerId: number): Promise<number> {
  const { monthStart } = calendarMonthBoundsForUsage();
  const [row] = await db
    .select({ c: count() })
    .from(orders)
    .where(and(eq(orders.buyerId, buyerId), gte(orders.createdAt, monthStart)));
  return Number(row?.c ?? 0);
}

/**
 * Public-facing subscription shape. Τα timestamps βγαίνουν ως ISO strings
 * ώστε να είναι safe σε JSON (το RN JSON.parse κρατά strings, όχι Dates).
 * `isPro` είναι υπολογιζόμενο ώστε ο client να μην χρειάζεται να ξέρει
 * το internal mapping πριν ενεργοποιήσει gated features.
 */
function mapSubscriptionRow(row: {
  plan: string;
  status: string;
  renewsAt: Date | null;
  canceledAt: Date | null;
  trialEndsAt: Date | null;
  updatedAt: Date;
}) {
  const plan = (SUBSCRIPTION_PLANS as readonly string[]).includes(row.plan)
    ? (row.plan as SubscriptionPlan)
    : "free";
  const status = (SUBSCRIPTION_STATUSES as readonly string[]).includes(row.status)
    ? (row.status as SubscriptionStatus)
    : "active";
  // canceled = ενεργό μέχρι το renewsAt· expired = τελείωσε.
  const isPro = plan === "pro" && (status === "active" || status === "trialing" || status === "canceled");
  return {
    plan,
    status,
    isPro,
    renewsAt: row.renewsAt?.toISOString() ?? null,
    canceledAt: row.canceledAt?.toISOString() ?? null,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Επιστρέφει (και lazy-creates) το subscription record του authenticated user.
 * Το auto-create είναι safety net για users που υπήρχαν πριν το S1 migration.
 *
 * Επιστρέφει `null` όταν ο user δεν υπάρχει πια (π.χ. stale JWT token μετά
 * από db re-seed). Αυτό αποτρέπει FK constraint crashes και επιτρέπει στο
 * endpoint να επιστρέψει καθαρό 401.
 */
async function getOrCreateSubscription(userId: number) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [userExists] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!userExists) return null;
  const [created] = await db
    .insert(subscriptions)
    .values({ userId, plan: "free", status: "active" })
    .returning();
  if (!created) throw new Error("Could not create subscription");
  return created;
}

app.get("/api/me/subscription", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const row = await getOrCreateSubscription(userId);
  // Stale JWT: ο user έχει διαγραφεί (π.χ. db re-seed). Επιστρέφουμε 401 ώστε
  // ο client να κάνει fallback στο default free subscription αντί να σκάσει.
  if (!row) return c.json({ error: "User no longer exists" }, 401);
  return c.json({ subscription: mapSubscriptionRow(row) });
});

/**
 * Φάση 2.1: χρήση μηνιαίου ορίου παραγγελιών για buyers (Δωρεάν = 10/μήνα).
 * Οι Pro users βλέπουν `limit: null` και `isUnlimited: true` για το ορατό Pro benefit.
 */
app.get("/api/me/orders/usage", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const [buyerRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!buyerRow) return c.json({ error: "User no longer exists" }, 401);
  if (buyerRow.role !== "buyer") {
    return c.json({ error: "Only buyers have order usage metering" }, 403);
  }

  const subRow = await getOrCreateSubscription(userId);
  if (!subRow) return c.json({ error: "User no longer exists" }, 401);

  const billing = mapSubscriptionRow(subRow);
  const used = await countBuyerOrdersSinceMonthStart(userId);
  const { resetsAt } = calendarMonthBoundsForUsage();

  if (billing.isPro) {
    return c.json({
      used,
      limit: null,
      isUnlimited: true,
      resetsAt: resetsAt.toISOString(),
    });
  }

  return c.json({
    used,
    limit: FREE_BUYER_MONTHLY_ORDER_LIMIT,
    isUnlimited: false,
    resetsAt: resetsAt.toISOString(),
  });
});

// ─── Multi-location & team invitations (buyer Φάση 3.1) ────────────────────

async function buyerLocationSeatCap(ownerUserId: number) {
  const subRow = await getOrCreateSubscription(ownerUserId);
  if (!subRow) return FREE_LOCATION_TEAM_CAP;
  const billing = mapSubscriptionRow(subRow);
  return billing.isPro ? PRO_LOCATION_TEAM_CAP : FREE_LOCATION_TEAM_CAP;
}

async function countBuyerOwnedLocations(ownerUserId: number) {
  const [row] = await db.select({ c: count() }).from(locations).where(eq(locations.ownerUserId, ownerUserId));
  return Number(row?.c ?? 0);
}

async function countMembersAtLocation(locationId: number) {
  const [row] = await db
    .select({ c: count() })
    .from(locationMembers)
    .where(eq(locationMembers.locationId, locationId));
  return Number(row?.c ?? 0);
}

async function countPendingInvitesAtLocation(locationId: number) {
  const [row] = await db
    .select({ c: count() })
    .from(locationInvites)
    .where(and(eq(locationInvites.locationId, locationId), eq(locationInvites.status, "pending")));
  return Number(row?.c ?? 0);
}

async function isLocationBillingOwner(actorUserId: number, locationId: number): Promise<boolean> {
  const [loc] = await db.select().from(locations).where(eq(locations.id, locationId)).limit(1);
  return Boolean(loc && loc.ownerUserId === actorUserId);
}

async function ensureBuyerLocationsBackfill(userId: number): Promise<void> {
  const [row] = await db
    .select({ c: count() })
    .from(locationMembers)
    .where(eq(locationMembers.userId, userId));
  const n = Number(row?.c ?? 0);
  if (n > 0) return;

  await db.transaction(async (tx) => {
    const [loc] = await tx
      .insert(locations)
      .values({ ownerUserId: userId, name: DEFAULT_BUYER_LOCATION_NAME, address: "" })
      .returning();
    if (!loc) return;
    await tx.insert(locationMembers).values({
      locationId: loc.id,
      userId,
      role: "owner",
    });
  });
}

const buyerLocationUpsertBody = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500).optional(),
});

const buyerLocationPatchBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().max(500).optional(),
});

const invitationEmailBody = z.object({
  email: z.string().email(),
});

const invitationAcceptBody = z.object({
  token: z.string().trim().min(8).max(200),
});

app.get("/api/me/locations", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Only buyers manage storefront locations" }, 403);

  await ensureBuyerLocationsBackfill(userId);

  const locRows = await db
    .select({
      loc: locations,
      role: locationMembers.role,
    })
    .from(locationMembers)
    .innerJoin(locations, eq(locationMembers.locationId, locations.id))
    .where(eq(locationMembers.userId, userId))
    .orderBy(asc(locations.id));

  const out = await Promise.all(
    locRows.map(async ({ loc, role }) => ({
      id: String(loc.id),
      ownerUserId: String(loc.ownerUserId),
      name: loc.name,
      address: loc.address,
      role,
      memberCount: await countMembersAtLocation(loc.id),
      pendingInviteCount: await countPendingInvitesAtLocation(loc.id),
      isOwner: loc.ownerUserId === userId,
      createdAt: loc.createdAt.getTime(),
    })),
  );

  return c.json({ locations: out });
});

app.post("/api/me/locations", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const parsed = buyerLocationUpsertBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  const subRow = await getOrCreateSubscription(userId);
  if (!subRow) return c.json({ error: "Unauthorized" }, 401);
  const billing = mapSubscriptionRow(subRow);

  await ensureBuyerLocationsBackfill(userId);
  const owned = await countBuyerOwnedLocations(userId);
  const locationCap = billing.isPro ? PRO_BUYER_MAX_LOCATIONS_CAP : FREE_BUYER_MAX_LOCATIONS_CAP;
  if (owned >= locationCap) {
    return c.json({ error: "locations_limit_reached", limit: locationCap }, 402);
  }

  const { name, address } = parsed.data;
  const addr = address?.trim() ?? "";
  const [loc] = await db
    .insert(locations)
    .values({
      ownerUserId: userId,
      name,
      address: addr,
    })
    .returning();
  if (!loc) return c.json({ error: "Could not create location" }, 500);

  await db.insert(locationMembers).values({
    locationId: loc.id,
    userId,
    role: "owner",
  });

  return c.json(
    {
      location: {
        id: String(loc.id),
        ownerUserId: String(loc.ownerUserId),
        name: loc.name,
        address: loc.address,
        role: "owner",
        memberCount: await countMembersAtLocation(loc.id),
        pendingInviteCount: 0,
        isOwner: true,
        createdAt: loc.createdAt.getTime(),
      },
    },
    201,
  );
});

app.patch("/api/me/locations/:id", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const lid = Number(c.req.param("id"));
  if (!Number.isFinite(lid) || lid < 1) return c.json({ error: "Bad id" }, 400);

  const ownerOk = await isLocationBillingOwner(userId, lid);
  if (!ownerOk) return c.json({ error: "Forbidden" }, 403);

  const parsed = buyerLocationPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  const { name, address } = parsed.data;
  if (name === undefined && address === undefined) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  const patch: { name?: string; address?: string } = {};
  if (name !== undefined) patch.name = name;
  if (address !== undefined) patch.address = address.trim();

  const [updated] = await db
    .update(locations)
    .set(patch)
    .where(eq(locations.id, lid))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);

  return c.json({
    location: {
      id: String(updated.id),
      ownerUserId: String(updated.ownerUserId),
      name: updated.name,
      address: updated.address,
      role: "owner",
      memberCount: await countMembersAtLocation(updated.id),
      pendingInviteCount: await countPendingInvitesAtLocation(updated.id),
      isOwner: true,
      createdAt: updated.createdAt.getTime(),
    },
  });
});

app.delete("/api/me/locations/:id", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const lid = Number(c.req.param("id"));
  if (!Number.isFinite(lid) || lid < 1) return c.json({ error: "Bad id" }, 400);

  const ownerOk = await isLocationBillingOwner(userId, lid);
  if (!ownerOk) return c.json({ error: "Forbidden" }, 403);

  const owned = await countBuyerOwnedLocations(userId);
  if (owned <= 1) {
    return c.json({ error: "cannot_delete_only_location", code: "last_location" }, 400);
  }

  await db.delete(locations).where(eq(locations.id, lid));
  return c.newResponse(null, 204);
});

app.get("/api/me/locations/:id/members", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const lid = Number(c.req.param("id"));
  if (!Number.isFinite(lid) || lid < 1) return c.json({ error: "Bad id" }, 400);

  const memberOk = await isBuyerMemberOfLocation(userId, lid);
  if (!memberOk) return c.json({ error: "Forbidden" }, 403);

  const rows = await db
    .select({ lm: locationMembers, name: users.name, email: users.email })
    .from(locationMembers)
    .innerJoin(users, eq(locationMembers.userId, users.id))
    .where(eq(locationMembers.locationId, lid));

  return c.json({
    members: rows.map(({ lm, name, email }) => ({
      userId: String(lm.userId),
      name,
      email,
      role: lm.role,
    })),
  });
});

app.delete("/api/me/locations/:id/members/:memberUserId", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const lid = Number(c.req.param("id"));
  const victim = Number(c.req.param("memberUserId"));
  if (!Number.isFinite(lid) || !Number.isFinite(victim))
    return c.json({ error: "Bad id" }, 400);

  const ownerOk = await isLocationBillingOwner(userId, lid);
  if (!ownerOk) return c.json({ error: "Forbidden" }, 403);
  if (victim === userId) return c.json({ error: "cannot_remove_owner_from_team" }, 400);

  await db.delete(locationMembers).where(
    and(
      eq(locationMembers.locationId, lid),
      eq(locationMembers.userId, victim),
      eq(locationMembers.role, "staff"),
    ),
  );
  return c.newResponse(null, 204);
});

app.post("/api/me/locations/:id/invitations", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const lid = Number(c.req.param("id"));
  if (!Number.isFinite(lid) || lid < 1) return c.json({ error: "Bad id" }, 400);

  const ownerOk = await isLocationBillingOwner(userId, lid);
  if (!ownerOk) return c.json({ error: "Forbidden" }, 403);

  const parsed = invitationEmailBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }
  const email = normalizeBuyerEmail(parsed.data.email);

  const [locRow] = await db.select().from(locations).where(eq(locations.id, lid)).limit(1);
  if (!locRow) return c.json({ error: "Location not found" }, 404);

  const [ownerSelf] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (ownerSelf && normalizeBuyerEmail(ownerSelf.email) === email) {
    return c.json({ error: "cannot_invite_self" }, 400);
  }

  const [targetUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (targetUser && targetUser.role !== "buyer") {
    return c.json({ error: "invite_target_must_be_buyer" }, 400);
  }

  const [alreadyMember] = targetUser
    ? await db
        .select()
        .from(locationMembers)
        .where(and(eq(locationMembers.locationId, lid), eq(locationMembers.userId, targetUser.id)))
        .limit(1)
    : [null];

  if (alreadyMember) {
    return c.json({ error: "already_member" }, 409);
  }

  const seatCap = await buyerLocationSeatCap(locRow.ownerUserId);
  const taken =
    (await countMembersAtLocation(lid)) + (await countPendingInvitesAtLocation(lid));

  const [duplicatePending] = await db
    .select()
    .from(locationInvites)
    .where(and(eq(locationInvites.locationId, lid), eq(locationInvites.email, email), eq(locationInvites.status, "pending")))
    .limit(1);
  if (duplicatePending) {
    return c.json({ error: "invite_already_pending", token: duplicatePending.token }, 409);
  }

  if (taken >= seatCap) {
    return c.json({ error: "seats_limit_reached", limit: seatCap }, 402);
  }

  const token = `invite-${randomUUID().replace(/-/g, "").slice(0, 20)}`;

  await db.insert(locationInvites).values({
    locationId: lid,
    email,
    invitedByUserId: userId,
    token,
    status: "pending",
  });

  return c.json(
    {
      invitation: {
        token,
        email,
        /** Dev/demo: μέχρι να υπάρξει transactional email. */
        devNote:
          "Χρησιμοποίησε αυτό το token στο POST /api/me/invitations/accept από τον προσκεκλημένο buyer λογαριασμό.",
      },
    },
    201,
  );
});

app.get("/api/me/invitations/incoming", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const normalized = normalizeBuyerEmail(u.email);
  const rows = await db
    .select({ inv: locationInvites, loc: locations })
    .from(locationInvites)
    .innerJoin(locations, eq(locationInvites.locationId, locations.id))
    .where(and(eq(locationInvites.email, normalized), eq(locationInvites.status, "pending")));

  return c.json({
    invitations: rows.map(({ inv, loc }) => ({
      token: inv.token,
      email: inv.email,
      locationId: String(loc.id),
      locationName: loc.name,
      createdAt: inv.createdAt.getTime(),
    })),
  });
});

app.post("/api/me/invitations/accept", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const parsed = invitationAcceptBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid body" }, 400);

  const [inviteRow] = await db
    .select()
    .from(locationInvites)
    .where(eq(locationInvites.token, parsed.data.token))
    .limit(1);
  if (!inviteRow || inviteRow.status !== "pending") {
    return c.json({ error: "invite_not_pending" }, 400);
  }

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const selfEmail = normalizeBuyerEmail(u.email);
  if (selfEmail !== normalizeBuyerEmail(inviteRow.email)) {
    return c.json({ error: "invite_wrong_account" }, 403);
  }

  const memberOkBefore = await isBuyerMemberOfLocation(userId, inviteRow.locationId);
  if (memberOkBefore) {
    await db
      .update(locationInvites)
      .set({ status: "canceled" })
      .where(eq(locationInvites.id, inviteRow.id));
    return c.json({ ok: true, alreadyMember: true });
  }

  const [locRow] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, inviteRow.locationId))
    .limit(1);
  if (!locRow) return c.json({ error: "Location missing" }, 404);

  const seatCap = await buyerLocationSeatCap(locRow.ownerUserId);
  const occupied = await countMembersAtLocation(inviteRow.locationId);
  if (occupied >= seatCap) {
    return c.json({ error: "seats_limit_reached", limit: seatCap }, 402);
  }

  await db.transaction(async (tx) => {
    await tx.insert(locationMembers).values({
      locationId: inviteRow.locationId,
      userId,
      role: "staff",
    });
    await tx
      .update(locationInvites)
      .set({ status: "accepted" })
      .where(eq(locationInvites.id, inviteRow.id));
  });

  return c.json({ ok: true });
});

app.post("/api/me/invitations/decline", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const parsed = invitationAcceptBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid body" }, 400);

  const [inviteRow] = await db
    .select()
    .from(locationInvites)
    .where(eq(locationInvites.token, parsed.data.token))
    .limit(1);

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (
    !inviteRow ||
    !u ||
    u.role !== "buyer" ||
    normalizeBuyerEmail(u.email) !== normalizeBuyerEmail(inviteRow.email) ||
    inviteRow.status !== "pending"
  ) {
    return c.json({ error: "Forbidden or invalid invitation" }, 403);
  }

  await db
    .update(locationInvites)
    .set({ status: "declined" })
    .where(eq(locationInvites.id, inviteRow.id));

  return c.json({ ok: true });
});

// ─── Price alerts (buyer Pro — Φάση 3.2, MVP χωρίς push) ────────────────────

const createPriceAlertBody = z.object({
  productId: z.number().int().positive(),
  thresholdEur: z.number().min(0.01).max(999_999),
});

const patchPriceAlertBody = z.object({
  thresholdEur: z.number().min(0.01).max(999_999).optional(),
  active: z.boolean().optional(),
});

function thresholdEurToDbString(value: number): string {
  return value.toFixed(2);
}

type PriceAlertJoinRow = {
  a: typeof priceAlerts.$inferSelect;
  p: typeof products.$inferSelect;
  s: typeof suppliers.$inferSelect;
};

function serializePriceAlertRow({ a, p, s }: PriceAlertJoinRow) {
  return {
    id: String(a.id),
    productId: String(a.productId),
    productName: p.name,
    supplierName: s.name,
    currentPriceEur: Number(p.priceEur),
    threshold: a.threshold,
    active: a.active,
    armed: a.armed,
    triggeredAt:
      a.triggeredAt instanceof Date
        ? a.triggeredAt.getTime()
        : a.triggeredAt != null
          ? Number(a.triggeredAt)
          : null,
    createdAt: a.createdAt.getTime(),
  };
}

async function loadPriceAlertJoin(userId: number, alertId: number): Promise<PriceAlertJoinRow | null> {
  const [row] = await db
    .select({ a: priceAlerts, p: products, s: suppliers })
    .from(priceAlerts)
    .innerJoin(products, eq(priceAlerts.productId, products.id))
    .innerJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.id, alertId)))
    .limit(1);
  return row ?? null;
}

app.get("/api/me/price-alerts", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const subRow = await getOrCreateSubscription(userId);
  if (!subRow) return c.json({ error: "User no longer exists" }, 401);

  const billing = mapSubscriptionRow(subRow);
  // Free tier: κενή λίστα (το UI ήδη κλείνει τη δημιουργία με GatedAction).
  if (!billing.isPro) return c.json({ alerts: [] });

  const rows = await db
    .select({ a: priceAlerts, p: products, s: suppliers })
    .from(priceAlerts)
    .innerJoin(products, eq(priceAlerts.productId, products.id))
    .innerJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(priceAlerts.userId, userId))
    .orderBy(desc(priceAlerts.createdAt));

  return c.json({ alerts: rows.map(serializePriceAlertRow) });
});

app.post("/api/me/price-alerts", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const subRow = await getOrCreateSubscription(userId);
  if (!subRow) return c.json({ error: "User no longer exists" }, 401);

  const billing = mapSubscriptionRow(subRow);
  if (!billing.isPro) {
    return c.json({ error: "price_alerts_requires_pro", code: "requires_pro" }, 402);
  }

  const parsed = createPriceAlertBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  const productIdNum = parsed.data.productId;

  const [duplicate] = await db
    .select({ id: priceAlerts.id })
    .from(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.productId, productIdNum)))
    .limit(1);
  if (duplicate) {
    return c.json({ error: "duplicate_price_alert" }, 409);
  }

  const [joinedProduct] = await db
    .select({ p: products, s: suppliers })
    .from(products)
    .innerJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(products.id, productIdNum))
    .limit(1);

  if (!joinedProduct) {
    return c.json({ error: "Product not found" }, 404);
  }

  const thr = thresholdEurToDbString(parsed.data.thresholdEur);

  const [inserted] = await db
    .insert(priceAlerts)
    .values({
      userId,
      productId: productIdNum,
      threshold: thr,
      active: true,
      armed: true,
    })
    .returning();

  if (!inserted) return c.json({ error: "Could not create price alert" }, 500);

  const joined =
    (await loadPriceAlertJoin(userId, inserted.id)) ??
    ({
      a: inserted,
      p: joinedProduct.p,
      s: joinedProduct.s,
    } satisfies PriceAlertJoinRow);

  return c.json({ alert: serializePriceAlertRow(joined) }, 201);
});

app.patch("/api/me/price-alerts/:id", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const alertId = Number(c.req.param("id"));
  if (!Number.isFinite(alertId) || alertId < 1) return c.json({ error: "Bad id" }, 400);

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const subRow = await getOrCreateSubscription(userId);
  if (!subRow) return c.json({ error: "User no longer exists" }, 401);
  const billing = mapSubscriptionRow(subRow);
  if (!billing.isPro) {
    return c.json({ error: "price_alerts_requires_pro", code: "requires_pro" }, 402);
  }

  const parsed = patchPriceAlertBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  if (parsed.data.thresholdEur === undefined && parsed.data.active === undefined) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  const [existing] = await db
    .select()
    .from(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.id, alertId)))
    .limit(1);

  if (!existing) return c.json({ error: "Not found" }, 404);

  const setPatch: Partial<typeof priceAlerts.$inferInsert> = {};
  if (parsed.data.thresholdEur !== undefined) {
    setPatch.threshold = thresholdEurToDbString(parsed.data.thresholdEur);
    setPatch.armed = true;
  }
  if (parsed.data.active !== undefined) {
    setPatch.active = parsed.data.active;
    if (parsed.data.active) setPatch.armed = true;
  }

  await db.update(priceAlerts).set(setPatch).where(eq(priceAlerts.id, alertId));

  const joinedAfter = await loadPriceAlertJoin(userId, alertId);
  if (!joinedAfter) return c.json({ error: "Not found" }, 404);

  return c.json({ alert: serializePriceAlertRow(joinedAfter) });
});

app.delete("/api/me/price-alerts/:id", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const alertId = Number(c.req.param("id"));
  if (!Number.isFinite(alertId) || alertId < 1) return c.json({ error: "Bad id" }, 400);

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  await db.delete(priceAlerts).where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.id, alertId)));

  return c.newResponse(null, 204);
});

const expoPushTokenBody = z.object({
  token: z.string().min(20).max(600),
  platform: z.enum(["ios", "android"]),
});

const notificationPrefsBody = z.object({
  priceAlertEmailDigest: z.boolean(),
});

app.post("/api/me/notifications/push-token", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const parsed = expoPushTokenBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  await db
    .insert(userPushTokens)
    .values({
      userId,
      token: parsed.data.token,
      platform: parsed.data.platform,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPushTokens.token,
      set: {
        userId,
        platform: parsed.data.platform,
        updatedAt: new Date(),
      },
    });

  return c.json({ ok: true });
});

/** Καθαρίζει όλα τα Expo tokens του χρήστη (καλείται στο sign-out ώστε να μη μείνουν stale targets). */
app.delete("/api/me/notifications/push-tokens", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  await db.delete(userPushTokens).where(eq(userPushTokens.userId, userId));

  return c.newResponse(null, 204);
});

app.get("/api/me/notification-preferences", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const [u] = await db
    .select({ priceAlertEmailDigest: users.priceAlertEmailDigest })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return c.json({ error: "User no longer exists" }, 401);

  return c.json({ priceAlertEmailDigest: u.priceAlertEmailDigest });
});

app.patch("/api/me/notification-preferences", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const parsed = notificationPrefsBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  await db
    .update(users)
    .set({ priceAlertEmailDigest: parsed.data.priceAlertEmailDigest })
    .where(eq(users.id, userId));

  return c.json({ priceAlertEmailDigest: parsed.data.priceAlertEmailDigest });
});

app.get("/api/me/spending", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || u.role !== "buyer") return c.json({ error: "Forbidden" }, 403);

  const monthsQ = c.req.query("months");
  const parsed = z.enum(["3", "6", "12"]).safeParse(monthsQ ?? "6");
  const rangeMonths = (parsed.success ? Number(parsed.data) : 6) as SpendingMonthsOption;

  const subRow = await getOrCreateSubscription(userId);
  if (!subRow) return c.json({ error: "User no longer exists" }, 401);
  const billing = mapSubscriptionRow(subRow);

  const spending = await aggregateBuyerSpending({
    buyerId: userId,
    isPro: billing.isPro,
    rangeMonths,
  });
  return c.json({ spending });
});

// ─── Cart endpoints (buyer-only, server-side cart sync) ───────────────────
//
// Ο cart είναι server-side ώστε να επιβιώνει σε:
//  - reinstall app
//  - login σε άλλη συσκευή του ίδιου χρήστη
//  - signout/signin κύκλο
//
// Ο client κρατά local copy (Zustand) ως optimistic cache, αλλά σε κάθε
// αλλαγή κάνει write-through στον server. Στο bootstrap (login/app start)
// γίνεται hydrate από το server και αντικαθίσταται η local state.

/**
 * Επιστρέφει τον hydrated cart row με όλα τα πεδία που χρειάζεται το client
 * UI (`CartItem` shape) — joins με products & suppliers ώστε ο buyer να βλέπει
 * **τρέχουσα** τιμή/όνομα, όχι stale snapshot από προηγούμενη session.
 *
 * Trade-off: αν αλλάξει η τιμή supplier-side ενώ ο buyer έχει το προϊόν στο
 * cart, βλέπει την νέα τιμή σε επόμενο load. Για B2B αυτό είναι σωστή
 * συμπεριφορά — δεν θέλουμε να ξεκινήσει checkout με ξεπερασμένη τιμή.
 */
async function loadCartForUser(userId: number) {
  const rows = await db
    .select({
      cartId: cartItems.id,
      productId: cartItems.productId,
      qty: cartItems.qty,
      updatedAt: cartItems.updatedAt,
      productName: products.name,
      unit: products.unit,
      priceEur: products.priceEur,
      supplierId: products.supplierId,
      supplierName: suppliers.name,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(desc(cartItems.updatedAt));

  return rows.map((r) => ({
    productId: String(r.productId),
    supplierId: String(r.supplierId),
    supplierName: r.supplierName,
    productName: r.productName,
    unit: r.unit,
    // priceEur σε products κρατιέται ως decimal string ("18.90"). Το client
    // type αναμένει number για cart math — μετατροπή εδώ, παρά να το κάνει
    // ο κάθε consumer (DRY).
    priceEur: Number(r.priceEur),
    qty: r.qty,
    // Το client χρησιμοποιεί addedAt για ταξινόμηση «νεότερα στην κορυφή».
    // Μετά το server sync, το updatedAt λειτουργεί ως ένας πιο σωστός proxy
    // (αυξάνεται και σε qty changes, όχι μόνο σε first add).
    addedAt: r.updatedAt.getTime(),
  }));
}

/** Guard για buyer-only cart endpoints. Επιστρέφει error response ή `null`. */
async function requireBuyerOrError(c: Context, userId: number) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return c.json({ error: "User no longer exists" }, 401);
  if (u.role !== "buyer") {
    return c.json({ error: "Only buyers have a cart" }, 403);
  }
  return null;
}

app.get("/api/me/cart", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const forbidden = await requireBuyerOrError(c, userId);
  if (forbidden) return forbidden;
  const items = await loadCartForUser(userId);
  return c.json({ items });
});

const upsertCartItemBody = z.object({
  qty: z.number().int().min(0).max(9999),
});

app.put("/api/me/cart/items/:productId", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const forbidden = await requireBuyerOrError(c, userId);
  if (forbidden) return forbidden;

  const productId = Number(c.req.param("productId"));
  if (!Number.isFinite(productId) || productId < 1) {
    return c.json({ error: "Invalid productId" }, 400);
  }

  const parsed = upsertCartItemBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }
  const { qty } = parsed.data;

  // qty === 0 σημαίνει «remove». Δεν χρειάζεται separate DELETE endpoint —
  // το client μπορεί απλά να στείλει PUT με qty 0 (πιο idempotent UX).
  if (qty === 0) {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
    const items = await loadCartForUser(userId);
    return c.json({ items });
  }

  // Validate ότι το προϊόν υπάρχει πριν προσθέσουμε row — αλλιώς έχουμε
  // dangling cart item που θα έσκαγε στο επόμενο load.
  const [productRow] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!productRow) return c.json({ error: "Product not found" }, 404);

  const now = new Date();
  // Manual upsert: SQLite έχει ON CONFLICT αλλά για να μη δεσμευτούμε σε
  // dialect-specific syntax εδώ, κάνουμε explicit check-then-update/insert.
  // Σε κανονική load είναι 1-2 queries για write — αμελητέο.
  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(cartItems)
      .set({ qty, updatedAt: now })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({ userId, productId, qty, updatedAt: now });
  }

  const items = await loadCartForUser(userId);
  return c.json({ items });
});

app.delete("/api/me/cart", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const forbidden = await requireBuyerOrError(c, userId);
  if (forbidden) return forbidden;
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
  return c.json({ items: [] });
});

app.delete("/api/me/cart/supplier/:supplierId", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const forbidden = await requireBuyerOrError(c, userId);
  if (forbidden) return forbidden;

  const supplierId = Number(c.req.param("supplierId"));
  if (!Number.isFinite(supplierId) || supplierId < 1) {
    return c.json({ error: "Invalid supplierId" }, 400);
  }

  // Διαγραφή cart_items όπου το product ανήκει στον συγκεκριμένο supplier.
  // Subquery αντί για JOIN-on-delete γιατί το SQLite υποστηρίζει subqueries
  // καθαρά και είναι εύκολα διαβάσιμο.
  const productRows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.supplierId, supplierId));
  const productIds = productRows.map((p) => p.id);

  if (productIds.length > 0) {
    await db
      .delete(cartItems)
      .where(
        and(eq(cartItems.userId, userId), inArray(cartItems.productId, productIds)),
      );
  }

  const items = await loadCartForUser(userId);
  return c.json({ items });
});

// ─── Favorites (buyer-only, Φάση 2.2) ────────────────────────────────────

async function loadFavoriteSuppliersForUser(userId: number) {
  const rows = await db
    .select({ supplierRow: suppliers })
    .from(favorites)
    .innerJoin(suppliers, eq(favorites.supplierId, suppliers.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
  return rows.map((r) => mapSupplierRow(r.supplierRow));
}

app.get("/api/me/favorites", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const forbidden = await requireBuyerOrError(c, userId);
  if (forbidden) return forbidden;
  const list = await loadFavoriteSuppliersForUser(userId);
  return c.json({ suppliers: list });
});

const addFavoriteBody = z.object({
  supplierId: z.number().int().positive(),
});

app.post("/api/me/favorites", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const forbidden = await requireBuyerOrError(c, userId);
  if (forbidden) return forbidden;

  const parsed = addFavoriteBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }
  const { supplierId } = parsed.data;

  const [supplierRow] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
  if (!supplierRow) return c.json({ error: "Supplier not found" }, 404);

  const [existingFav] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.supplierId, supplierId)))
    .limit(1);
  if (!existingFav) {
    const subRow = await getOrCreateSubscription(userId);
    if (!subRow) return c.json({ error: "User no longer exists" }, 401);

    const billing = mapSubscriptionRow(subRow);
    if (!billing.isPro) {
      const [aggregate] = await db
        .select({ n: count() })
        .from(favorites)
        .where(eq(favorites.userId, userId));
      const favCount = Number(aggregate?.n ?? 0);
      if (favCount >= FREE_BUYER_MAX_SAVED_SUPPLIERS) {
        return c.json(
          { error: "favorites_limit_reached", limit: FREE_BUYER_MAX_SAVED_SUPPLIERS },
          402,
        );
      }
    }

    await db.insert(favorites).values({ userId, supplierId });
  }

  const list = await loadFavoriteSuppliersForUser(userId);
  return c.json({ suppliers: list });
});

app.delete("/api/me/favorites/:supplierId", async (c) => {
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const forbidden = await requireBuyerOrError(c, userId);
  if (forbidden) return forbidden;

  const supplierId = Number(c.req.param("supplierId"));
  if (!Number.isFinite(supplierId) || supplierId < 1) {
    return c.json({ error: "Invalid supplierId" }, 400);
  }

  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.supplierId, supplierId)));

  const list = await loadFavoriteSuppliersForUser(userId);
  return c.json({ suppliers: list });
});

// ─── Dev-only endpoints για το mock-billing flow ───────────────────────────
//
// Ενεργοποιούνται μόνο όταν NODE_ENV !== "production" ώστε να μη γίνει ποτέ
// deploy σε live server χωρίς hard gate. Αντικαθίστανται από RevenueCat
// webhooks όταν μπει το πραγματικό billing (μετά το TestFlight).

const devActivateBody = z.object({
  plan: z.enum(["pro"]).default("pro"),
  // Μήνες μέχρι το renewal — default 1 (monthly). Το yearly plan θα στέλνει 12.
  months: z.number().int().min(1).max(24).default(1),
});

function assertDevEnv(c: Context) {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 404);
  }
  return null;
}

app.post("/api/dev/subscription/activate", async (c) => {
  const forbidden = assertDevEnv(c);
  if (forbidden) return forbidden;
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const parsed = devActivateBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "Invalid body" }, 400);
  }
  const now = new Date();
  const renewsAt = new Date(now);
  renewsAt.setMonth(renewsAt.getMonth() + parsed.data.months);

  const ensured = await getOrCreateSubscription(userId);
  if (!ensured) return c.json({ error: "User no longer exists" }, 401);
  const [updated] = await db
    .update(subscriptions)
    .set({
      plan: parsed.data.plan,
      status: "active",
      renewsAt,
      canceledAt: null,
      trialEndsAt: null,
      updatedAt: now,
    })
    .where(eq(subscriptions.userId, userId))
    .returning();
  if (!updated) return c.json({ error: "Could not activate" }, 500);
  return c.json({ subscription: mapSubscriptionRow(updated) });
});

const devCancelBody = z
  .object({
    // Αν `true`, το plan επιστρέφει σε free άμεσα (dev-only demo convenience).
    // Στο πραγματικό billing (RevenueCat) δεν θα υπάρχει αυτή η επιλογή —
    // ο user διατηρεί Pro μέχρι το renewsAt, όπως κάνει το Apple/Google.
    immediate: z.boolean().optional().default(false),
  })
  .optional();

app.post("/api/dev/subscription/cancel", async (c) => {
  const forbidden = assertDevEnv(c);
  if (forbidden) return forbidden;
  const userId = await getAuthUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const parsed = devCancelBody.safeParse(await c.req.json().catch(() => ({})));
  const immediate = parsed.success ? (parsed.data?.immediate ?? false) : false;

  const sub = await getOrCreateSubscription(userId);
  if (!sub) return c.json({ error: "User no longer exists" }, 401);
  const now = new Date();

  if (immediate) {
    // Demo shortcut: πέφτει αμέσως σε free/expired, καθαρίζουμε renewsAt ώστε
    // το UI να μην δείξει «Λήγει στις …» που δεν ισχύει.
    const [updated] = await db
      .update(subscriptions)
      .set({
        plan: "free",
        status: "expired",
        canceledAt: now,
        renewsAt: null,
        trialEndsAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId))
      .returning();
    if (!updated) return c.json({ error: "Could not cancel" }, 500);
    return c.json({ subscription: mapSubscriptionRow(updated) });
  }

  // SaaS-standard cancel: διατηρεί Pro μέχρι το renewsAt αλλά δεν ανανεώνεται.
  // Αν δεν υπάρχει renewsAt (πχ free), καθαρίζουμε απευθείας σε expired.
  const nextStatus: SubscriptionStatus =
    sub.plan === "pro" && sub.renewsAt && sub.renewsAt > now ? "canceled" : "expired";
  const [updated] = await db
    .update(subscriptions)
    .set({ status: nextStatus, canceledAt: now, updatedAt: now })
    .where(eq(subscriptions.userId, userId))
    .returning();
  if (!updated) return c.json({ error: "Could not cancel" }, 500);
  return c.json({ subscription: mapSubscriptionRow(updated) });
});

export { app };
