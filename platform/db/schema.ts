import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Buyer or supplier account (central platform users). */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // buyer | supplier
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/** Supplier storefront on the marketplace (catalog entity). */
export const suppliers = sqliteTable(
  "suppliers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    location: text("location").notNull(),
    rating: integer("rating").notNull(), // stored as rating * 10, e.g. 49 = 4.9
    deliveryTime: text("delivery_time").notNull(),
    minimumOrder: text("minimum_order").notNull(),
    verified: integer("verified", { mode: "boolean" }).notNull().default(true),
    highlight: text("highlight").notNull(),
    // Optional geographic coordinates για το map preview στο supplier profile.
    // Nullable γιατί legacy rows μπορεί να μην έχουν — το UI γίνεται gate-άρει.
    latitude: real("latitude"),
    longitude: real("longitude"),
    ownerUserId: integer("owner_user_id").references(() => users.id),
  },
  (t) => [index("suppliers_category_idx").on(t.category)],
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    unit: text("unit").notNull(),
    priceEur: text("price_eur").notNull(), // decimal string e.g. "18.90"
    availability: text("availability").notNull(), // immediate | limited
    category: text("category").notNull(),
  },
  (t) => [index("products_supplier_idx").on(t.supplierId)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull().unique(),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => users.id),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    status: text("status").notNull(), // new | processing | in_transit | completed
    totalEur: text("total_eur").notNull(),
    itemCount: integer("item_count").notNull(),
    deliveryWindow: text("delivery_window").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("orders_buyer_idx").on(t.buyerId)],
);

/**
 * Γραμμές παραγγελίας — μία ανά μοναδικό προϊόν στο order. Κρατάμε
 * **denormalized snapshot** των πεδίων προϊόντος (name, unit, unitPriceEur)
 * ώστε αν αλλάξει το `products` row μελλοντικά (rename, νέα τιμή, διαγραφή),
 * το ιστορικό της παραγγελίας να διατηρείται όπως ήταν τη στιγμή της
 * δημιουργίας — απαραίτητο για B2B audit / dispute resolution.
 *
 * `lineTotalEur` αποθηκεύεται υπολογισμένο για να μη χρειάζεται κάθε query
 * να κάνει qty*unitPriceEur — μικρό denormalization tradeoff αξίας για το
 * order list και total recap.
 */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    productName: text("product_name").notNull(),
    unit: text("unit").notNull(),
    unitPriceEur: text("unit_price_eur").notNull(),
    qty: integer("qty").notNull(),
    lineTotalEur: text("line_total_eur").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/**
 * Server-side buyer cart. Ένα row ανά (user, product) — qty αυξάνεται/μειώνεται
 * in-place αντί να δημιουργούμε duplicate rows. Καμία τιμή/snapshot εδώ:
 * τα products είναι single source of truth, το hydration endpoint κάνει join
 * για name/price/supplier ώστε ο buyer να βλέπει πάντα current data στο cart
 * (όχι stale snapshot από προηγούμενη session ή άλλη συσκευή).
 *
 * Cascade delete σε products: αν ο supplier διαγράψει το προϊόν, βγαίνει
 * αυτόματα από όλα τα carts. Cascade σε users: signed-out user που σβήνει
 * τον λογαριασμό του δεν αφήνει orphan cart rows.
 */
export const cartItems = sqliteTable(
  "cart_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull(),
    // Timestamp τελευταίας τροποποίησης — χρησιμεύει για ordering στο UI
    // (newest-first) και για future conflict resolution σε multi-device sync.
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    // Unique constraint — αποτρέπει duplicate rows ανά (user, product).
    // Το upsert endpoint βασίζεται σε αυτό για ON CONFLICT logic.
    uniqueIndex("cart_items_user_product_uq").on(t.userId, t.productId),
    index("cart_items_user_idx").on(t.userId),
  ],
);

/**
 * Buyer subscription. 1-to-1 με user (ένα active plan ανά user). Κρατάμε
 * renewsAt/canceledAt/trialEndsAt σαν nullable timestamps ώστε το backend να
 * υπολογίζει expiry χωρίς να εξαρτάται από external billing (mock-first).
 *
 * Όταν αργότερα μπει RevenueCat/StoreKit, το `plan` και τα timestamps θα
 * γράφονται από webhook — το client contract μένει ίδιο.
 */
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(), // free | pro
    status: text("status").notNull(), // active | canceled | expired | trialing
    renewsAt: integer("renews_at", { mode: "timestamp_ms" }),
    canceledAt: integer("canceled_at", { mode: "timestamp_ms" }),
    trialEndsAt: integer("trial_ends_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  cartItems: many(cartItems),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one }) => ({
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  supplier: one(suppliers, { fields: [orders.supplierId], references: [suppliers.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type SupplierRow = typeof suppliers.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type CartItemRow = typeof cartItems.$inferSelect;
