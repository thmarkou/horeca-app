import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("orders_buyer_idx").on(t.buyerId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one }) => ({
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  supplier: one(suppliers, { fields: [orders.supplierId], references: [suppliers.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type SupplierRow = typeof suppliers.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
