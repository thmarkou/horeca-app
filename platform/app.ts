import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { db } from "./db/client";
import { orders, products, subscriptions, suppliers, users } from "./db/schema";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./lib/auth";
import { formatAvailability, formatEur, formatOrderStatus } from "./lib/format";

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
  const [row] = await db
    .insert(users)
    .values({ email: normalized, passwordHash, name: name.trim(), role })
    .returning();
  if (!row) return c.json({ error: "Could not create user" }, 500);
  // Auto-enroll σε free plan ώστε κάθε authenticated user να έχει πάντα
  // subscription record. Το UI μετά διαβάζει απλά το plan/status.
  await db.insert(subscriptions).values({ userId: row.id, plan: "free", status: "active" });
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
  };
}

function mapProductRow(p: typeof products.$inferSelect) {
  return {
    id: String(p.id),
    supplierId: String(p.supplierId),
    name: p.name,
    unit: p.unit,
    price: formatEur(p.priceEur),
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
      })),
    });
  }

  const rows = await db
    .select({
      order: orders,
      supplierName: suppliers.name,
    })
    .from(orders)
    .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
    .where(eq(orders.buyerId, userId))
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
    })),
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
 */
async function getOrCreateSubscription(userId: number) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (existing) return existing;
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
  return c.json({ subscription: mapSubscriptionRow(row) });
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

  await getOrCreateSubscription(userId); // ensure row exists
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
