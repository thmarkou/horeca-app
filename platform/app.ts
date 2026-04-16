import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { db } from "./db/client";
import { orders, products, suppliers, users } from "./db/schema";
import { hashPassword, signToken, verifyPassword, verifyToken } from "./lib/auth";
import { formatAvailability, formatEur, formatOrderStatus } from "./lib/format";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
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

export { app };
