import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Buyer or supplier account (central platform users). */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // buyer | supplier
  /**
   * Buyer Pro · σύνοψη price hits σε email digest (Resend). Default on — απενεργοποιείται από account.
   * (Ο server αγνοεί αν λείπει κλειδί API.)
   */
  priceAlertEmailDigest: integer("price_alert_email_digest", { mode: "boolean" })
    .notNull()
    .default(true),
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

/** Buyer storefront / branch — billed under `ownerUserId` (billing account σύμφωνα με S5.d). */
export const locations = sqliteTable(
  "locations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerUserId: integer("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("locations_owner_idx").on(t.ownerUserId)],
);

export const locationMembers = sqliteTable(
  "location_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // owner | staff
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("location_members_location_user_uq").on(t.locationId, t.userId),
    index("location_members_location_idx").on(t.locationId),
    index("location_members_user_idx").on(t.userId),
  ],
);

/**
 * Το email-based invite flow χωρίς εξωτερικό mailer για το MVP· το token επιστρέφεται
 * στο creator και ο invitee χρησιμοποιεί το `/api/me/invitations/accept` από την εφαρμογή.
 */
export const locationInvites = sqliteTable(
  "location_invites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    invitedByUserId: integer("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    token: text("token").notNull().unique(),
    /** pending | accepted | declined | canceled */
    status: text("status").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index("location_invites_email_idx").on(t.email),
    index("location_invites_location_idx").on(t.locationId),
  ],
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
    /**
     * Buyer «κατάστημα» (location) που τοποθετήθηκε η παραγγελία — nullable για legacy rows
     * πριν τη Φάση 3.1· νέες παραγγελίες το γεμίζουν όταν υπάρχει μέλος team.
     */
    locationId: integer("location_id").references(() => locations.id, { onDelete: "set null" }),
    status: text("status").notNull(), // new | processing | in_transit | completed
    totalEur: text("total_eur").notNull(),
    itemCount: integer("item_count").notNull(),
    deliveryWindow: text("delivery_window").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("orders_buyer_idx").on(t.buyerId), index("orders_location_idx").on(t.locationId)],
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
 * Αγαπημένοι προμηθευτές buyer · το free tier capped server-side (Φάση 2.2).
 */
export const favorites = sqliteTable(
  "favorites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("favorites_user_supplier_uq").on(t.userId, t.supplierId),
    index("favorites_user_idx").on(t.userId),
  ],
);

/**
 * Buyer price-watch (Φάση 3.2). Όταν η τρέχουσα τιμή προϊόντος υποχωρήσει μέχρι ή
 * κάτω από το `threshold`, χτυπάει η «ειδοποίηση» (τώρα: server-side `triggeredAt`·
 * αργότερα: push / email).
 */
export const priceAlerts = sqliteTable(
  "price_alerts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    threshold: text("threshold").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    /**
     * Όταν true, την επόμενη διέλευση τιμής ≤ threshold το alert «πυροδοτεί»·
     * μετά γίνεται false μέχρι η τιμή να ανέβει ξανά πάνω από threshold.
     */
    armed: integer("armed", { mode: "boolean" }).notNull().default(true),
    triggeredAt: integer("triggered_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("price_alerts_user_product_uq").on(t.userId, t.productId),
    index("price_alerts_user_idx").on(t.userId),
    index("price_alerts_product_idx").on(t.productId),
  ],
);

/**
 * Expo push tokens για ειδοποιήσεις (τιμολογιακά hits κ.λπ.). Ένα token ανά συσκευή· unique token
 * για να μπορεί το ίδιο device να μετακινηθεί μεταξύ test users σε dev.
 */
export const userPushTokens = sqliteTable(
  "user_push_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: text("platform").notNull(), // ios | android
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("user_push_tokens_token_uq").on(t.token),
    index("user_push_tokens_user_idx").on(t.userId),
  ],
);

/**
 * Ιστορικό «χτυπημάτων» price alert — για push digest tracking & grouped email.
 */
export const priceAlertHits = sqliteTable(
  "price_alert_hits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    alertId: integer("alert_id")
      .notNull()
      .references(() => priceAlerts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull(),
    productName: text("product_name").notNull(),
    supplierName: text("supplier_name").notNull(),
    threshold: text("threshold").notNull(),
    priceAtHit: text("price_at_hit").notNull(),
    hitAt: integer("hit_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    pushSentAt: integer("push_sent_at", { mode: "timestamp_ms" }),
    emailDigestSentAt: integer("email_digest_sent_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("price_alert_hits_user_idx").on(t.userId),
    index("price_alert_hits_digest_null_idx").on(t.emailDigestSentAt),
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
  favorites: many(favorites),
  priceAlertsList: many(priceAlerts),
  ownedLocations: many(locations),
  locationMemberships: many(locationMembers),
  pushTokens: many(userPushTokens),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  supplier: one(suppliers, {
    fields: [favorites.supplierId],
    references: [suppliers.id],
  }),
}));

export const priceAlertsRelations = relations(priceAlerts, ({ one, many }) => ({
  user: one(users, { fields: [priceAlerts.userId], references: [users.id] }),
  product: one(products, { fields: [priceAlerts.productId], references: [products.id] }),
  hits: many(priceAlertHits),
}));

export const userPushTokensRelations = relations(userPushTokens, ({ one }) => ({
  user: one(users, { fields: [userPushTokens.userId], references: [users.id] }),
}));

export const priceAlertHitsRelations = relations(priceAlertHits, ({ one }) => ({
  user: one(users, { fields: [priceAlertHits.userId], references: [users.id] }),
  alert: one(priceAlerts, { fields: [priceAlertHits.alertId], references: [priceAlerts.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  orders: many(orders),
  favorites: many(favorites),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  priceAlerts: many(priceAlerts),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  supplier: one(suppliers, { fields: [orders.supplierId], references: [suppliers.id] }),
  location: one(locations, { fields: [orders.locationId], references: [locations.id] }),
  items: many(orderItems),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  owner: one(users, { fields: [locations.ownerUserId], references: [users.id] }),
  members: many(locationMembers),
  invites: many(locationInvites),
  orders: many(orders),
}));

export const locationMembersRelations = relations(locationMembers, ({ one }) => ({
  location: one(locations, { fields: [locationMembers.locationId], references: [locations.id] }),
  user: one(users, { fields: [locationMembers.userId], references: [users.id] }),
}));

export const locationInvitesRelations = relations(locationInvites, ({ one }) => ({
  location: one(locations, { fields: [locationInvites.locationId], references: [locations.id] }),
  invitedBy: one(users, { fields: [locationInvites.invitedByUserId], references: [users.id] }),
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
export type FavoriteRow = typeof favorites.$inferSelect;
export type PriceAlertRow = typeof priceAlerts.$inferSelect;
export type UserPushTokenRow = typeof userPushTokens.$inferSelect;
export type PriceAlertHitRow = typeof priceAlertHits.$inferSelect;
export type LocationRow = typeof locations.$inferSelect;
export type LocationMemberRow = typeof locationMembers.$inferSelect;
export type LocationInviteRow = typeof locationInvites.$inferSelect;
