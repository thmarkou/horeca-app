import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  applyAddItem,
  applyClearBySupplier,
  applyRemoveItem,
  applySetItemQty,
  selectGroupedBySupplier,
  selectItemCount,
  selectTotalEur,
  selectTotalQty,
  type CartItemInput,
  type CartState,
} from "../lib/cart-selectors";
import { getFirstName, getGreetingForDate, getGreetingWindow } from "../lib/greeting";
import { featuredProducts, recentOrders, suppliers } from "../lib/mocks/horeca";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Horeca Source mobile MVP", () => {
  it("έχει ενημερωμένο branding στο app config", () => {
    const config = readFileSync(path.join(root, "app.config.ts"), "utf8");

    expect(config).toContain('appName: "Horeca Source"');
    expect(config).toContain("horeca-source-icon-YUE3GiZc9HHTh2v6QQyKj3.png");
  });

  it("διαθέτει τα βασικά route files του MVP", () => {
    const requiredRoutes = [
      "app/index.tsx",
      "app/welcome.tsx",
      "app/sign-in.tsx",
      "app/sign-up.tsx",
      "app/catalog.tsx",
      "app/product-detail.tsx",
      "app/cart.tsx",
      "app/checkout.tsx",
      "app/supplier-profile.tsx",
      "app/order-detail.tsx",
      "app/(supplier-tabs)/index.tsx",
      "app/(supplier-tabs)/orders.tsx",
      "app/(supplier-tabs)/catalog.tsx",
      "app/(supplier-tabs)/account.tsx",
      "app/(supplier-tabs)/_layout.tsx",
      "app/(tabs)/index.tsx",
      "app/(tabs)/suppliers.tsx",
      "app/(tabs)/orders.tsx",
      "app/(tabs)/favorites.tsx",
      "app/(tabs)/account.tsx",
    ];

    requiredRoutes.forEach((rel) => {
      const filePath = path.join(root, rel);
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
    });
  });

  it("διατηρεί mock κατάλογο (suppliers, products, orders) για offline UI", () => {
    expect(suppliers.length).toBeGreaterThanOrEqual(3);
    expect(featuredProducts.length).toBeGreaterThanOrEqual(3);
    expect(recentOrders.length).toBeGreaterThanOrEqual(3);
    expect(suppliers.every((supplier) => supplier.name.length > 0)).toBe(true);
  });

  it("φορτώνει κατάλογο από την κεντρική πλατφόρμα (API)", () => {
    const src = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");
    expect(src).toContain("useFeaturedProductsQuery");
    expect(src).toContain("useSuppliersListQuery");
    expect(src).toContain("/api/catalog/");
  });

  it("έχει νέο backend φάκελο platform με Hono API", () => {
    expect(existsSync(path.join(root, "platform/app.ts"))).toBe(true);
    expect(existsSync(path.join(root, "platform/db/schema.ts"))).toBe(true);
  });

  it("έχει τα απαιτούμενα icon assets για iOS και Android branding", () => {
    const assetPaths = [
      "assets/images/icon.png",
      "assets/images/splash-icon.png",
      "assets/images/favicon.png",
      "assets/images/android-icon-foreground.png",
    ];

    assetPaths.forEach((rel) => {
      const filePath = path.join(root, rel);
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
    });
  });

  it("υποστηρίζει εναλλαγή ρόλου και λειτουργικό submit στη φόρμα εγγραφής", () => {
    const signUpScreen = readFileSync(path.join(root, "app/sign-up.tsx"), "utf8");

    expect(signUpScreen).toContain("useState");
    expect(signUpScreen).toContain('const [role, setRole] = useState<HorecaAccountRole>("buyer")');
    expect(signUpScreen).toContain('onPress={() => setRole("buyer")}');
    expect(signUpScreen).toContain('onPress={() => setRole("supplier")}');
    expect(signUpScreen).toContain("const handleCreateAccount = async () => {");
    expect(signUpScreen).toContain("onPress={handleCreateAccount}");
    expect(signUpScreen).toContain("registerWithEmailPassword");
    expect(signUpScreen).toContain("navigateAfterHorecaAuth");
    expect(signUpScreen).toContain("mapRegisterError");
  });

  it("αποφεύγει nested Text onPress links στις auth οθόνες", () => {
    const signUpScreen = readFileSync(path.join(root, "app/sign-up.tsx"), "utf8");
    const signInScreen = readFileSync(path.join(root, "app/sign-in.tsx"), "utf8");

    expect(signUpScreen).not.toContain(
      '<Text className="font-semibold text-primary" onPress={() => router.push("/sign-in")}>',
    );
    expect(signInScreen).not.toContain(
      '<Text className="font-semibold text-primary" onPress={() => router.push("/sign-up")}>',
    );
    expect(signUpScreen).toContain('<TouchableOpacity onPress={() => router.push("/sign-in")}>');
    expect(signInScreen).toContain('<TouchableOpacity onPress={() => router.push("/sign-up")}>');
  });

  it("αποφεύγει nested touchable κάρτες στη λίστα παραγγελιών", () => {
    const ordersScreen = readFileSync(path.join(root, "app/(tabs)/orders.tsx"), "utf8");

    // Root της κάρτας είναι View (όχι TouchableOpacity), για να μην έχουμε
    // nested touchable με τα εσωτερικά κουμπιά (Λεπτομέρειες / Επανάληψη).
    expect(ordersScreen).toContain('<View key={order.id} className="rounded-[24px] border border-border bg-surface p-4">');
    expect(ordersScreen).not.toContain(
      '<TouchableOpacity key={order.id} className="rounded-[24px] border border-border bg-surface p-4">',
    );
    expect(ordersScreen).toContain("Επανάληψη");
  });

  it("υποστηρίζει φίλτρα Ενεργές / Ιστορικό / Όλες στη λίστα παραγγελιών", () => {
    const ordersScreen = readFileSync(path.join(root, "app/(tabs)/orders.tsx"), "utf8");

    expect(ordersScreen).toContain('useState<OrderFilter>("active")');
    expect(ordersScreen).toContain('{ key: "active", label: "Ενεργές" }');
    expect(ordersScreen).toContain('{ key: "history", label: "Ιστορικό" }');
    expect(ordersScreen).toContain('{ key: "all", label: "Όλες" }');
  });

  it("περνάει το id στη λεπτομέρεια παραγγελίας αντί για hardcoded route", () => {
    const ordersScreen = readFileSync(path.join(root, "app/(tabs)/orders.tsx"), "utf8");
    const homeScreen = readFileSync(path.join(root, "app/(tabs)/index.tsx"), "utf8");
    const detailScreen = readFileSync(path.join(root, "app/order-detail.tsx"), "utf8");

    expect(ordersScreen).toContain('pathname: "/order-detail", params: { id: order.id }');
    expect(homeScreen).toContain('pathname: "/order-detail", params: { id: order.id }');
    expect(detailScreen).toContain('useLocalSearchParams<{ id?: string }>');
    // Από Φάση 0.4: το detail screen φέρνει την παραγγελία μέσω dedicated
    // endpoint (publicId-based), όχι filter πάνω σε list cache.
    expect(detailScreen).toContain("useOrderQuery({ publicId: id })");
  });

  it("επιλέγει σωστό χαιρετισμό ανά ώρα της ημέρας", () => {
    expect(getGreetingWindow(8)).toBe("morning");
    expect(getGreetingWindow(15)).toBe("afternoon");
    expect(getGreetingWindow(22)).toBe("evening");
    expect(getGreetingWindow(3)).toBe("evening");

    expect(getGreetingForDate(new Date("2026-04-16T08:00:00"))).toBe("Καλημέρα");
    expect(getGreetingForDate(new Date("2026-04-16T15:00:00"))).toBe("Καλησπέρα");
    expect(getGreetingForDate(new Date("2026-04-16T22:00:00"))).toBe("Καλό βράδυ");
  });

  it("εξάγει πρώτο όνομα ή fallback σε άδειο/κενό input", () => {
    expect(getFirstName("Γιώργος Παπαδόπουλος")).toBe("Γιώργος");
    expect(getFirstName("  Άννα  ")).toBe("Άννα");
    expect(getFirstName("")).toBe("φίλε");
    expect(getFirstName(null)).toBe("φίλε");
    expect(getFirstName(undefined, "φίλη")).toBe("φίλη");
  });

  it("αποφεύγει sign-in/sign-up CTAs στη buyer αρχική για authenticated χρήστες", () => {
    const homeScreen = readFileSync(path.join(root, "app/(tabs)/index.tsx"), "utf8");

    expect(homeScreen).not.toContain('router.push("/sign-in")');
    expect(homeScreen).not.toContain('router.push("/sign-up")');
    expect(homeScreen).toContain("Νέα παραγγελία");
    expect(homeScreen).toContain("Επανάληψη");
    expect(homeScreen).toContain("Γρήγορες ενέργειες");
    expect(homeScreen).toContain("Επισκόπηση");
  });

  it("supplier dashboard: ελληνικά, role label, metric tiles, preview παραδόσεων", () => {
    const dashboard = readFileSync(path.join(root, "app/(supplier-tabs)/index.tsx"), "utf8");

    expect(dashboard).not.toContain("Supplier dashboard");
    // Αντί για χαιρετισμό «καλό βράδυ, X», δείχνουμε το ρόλο σαν στατικό
    // label ώστε να είναι σαφές ποιο shell βλέπει ο χρήστης (UX choice).
    expect(dashboard).toContain(">Supplier<");
    expect(dashboard).not.toContain("getGreetingForDate");
    expect(dashboard).not.toContain("getFirstName");
    expect(dashboard).toContain("Επισκόπηση");
    expect(dashboard).toContain('label="Νέες παραγγελίες"');
    expect(dashboard).toContain("Επόμενες παραδόσεις");
    expect(dashboard).toContain('router.push("/(supplier-tabs)/orders")');
  });

  it("buyer home: ελληνικά UI αλλά role label «Buyer» αντί για χαιρετισμό", () => {
    const home = readFileSync(path.join(root, "app/(tabs)/index.tsx"), "utf8");
    // Static role label αντικαθιστά το προηγούμενο «{greeting}, {firstName}».
    expect(home).toContain(">Buyer<");
    expect(home).not.toContain("getGreetingForDate");
    // Ο firstName συνεχίζει να εξάγεται μόνο για το avatar initial — όχι text.
    expect(home).toContain("avatarInitial");
  });

  it("backend: /api/orders/recent φιλτράρει ανά ρόλο (buyer vs supplier)", () => {
    const platformApp = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    expect(platformApp).toContain('if (u.role === "supplier")');
    expect(platformApp).toContain("eq(suppliers.ownerUserId, userId)");
    expect(platformApp).toContain("eq(orders.supplierId, listing.id)");
    expect(platformApp).toContain("eq(orders.buyerId, userId)");
    expect(platformApp).toContain("counterpartyName: buyerName");
    expect(platformApp).toContain("counterpartyName: supplierName");
  });

  it("design system: μόνο canonical border radii (20/24/28, 2xl, full) — χωρίς random outliers", () => {
    // The app standardized on three arbitrary radii (20/24/28) + tailwind's
    // rounded-2xl (form inputs) + rounded-full (buttons/pills). Any other
    // bracket radius is a drift signal — catch it here before it spreads.
    const appFiles = [
      "app/cart.tsx",
      "app/catalog.tsx",
      "app/checkout.tsx",
      "app/order-detail.tsx",
      "app/product-detail.tsx",
      "app/sign-in.tsx",
      "app/sign-up.tsx",
      "app/supplier-profile.tsx",
      "app/welcome.tsx",
      "app/(tabs)/index.tsx",
      "app/(tabs)/orders.tsx",
      "app/(tabs)/suppliers.tsx",
      "app/(tabs)/favorites.tsx",
      "app/(tabs)/account.tsx",
      "app/(supplier-tabs)/index.tsx",
      "app/(supplier-tabs)/orders.tsx",
      "app/(supplier-tabs)/account.tsx",
      "app/(supplier-tabs)/catalog.tsx",
    ];

    const allowedBracketRadii = new Set(["20px", "24px", "28px"]);
    const bracketRadiusRegex = /rounded-\[(\d+px)\]/g;

    for (const rel of appFiles) {
      const filePath = path.join(root, rel);
      if (!existsSync(filePath)) continue;
      const source = readFileSync(filePath, "utf8");
      const matches = Array.from(source.matchAll(bracketRadiusRegex));
      for (const [, value] of matches) {
        expect(
          allowedBracketRadii.has(value),
          `${rel} uses non-canonical rounded-[${value}] — use 20/24/28`,
        ).toBe(true);
      }
    }
  });

  it("FilterTabs είναι extracted σε shared generic component (buyer & supplier orders)", () => {
    const filterTabsPath = path.join(root, "components/ui/filter-tabs.tsx");
    expect(existsSync(filterTabsPath), "components/ui/filter-tabs.tsx should exist").toBe(true);

    const buyerOrders = readFileSync(path.join(root, "app/(tabs)/orders.tsx"), "utf8");
    const supplierOrders = readFileSync(path.join(root, "app/(supplier-tabs)/orders.tsx"), "utf8");

    // Both screens must consume the shared component.
    expect(buyerOrders).toContain(
      'import { FilterTabs, type FilterTab } from "@/components/ui/filter-tabs"',
    );
    expect(supplierOrders).toContain(
      'import { FilterTabs, type FilterTab } from "@/components/ui/filter-tabs"',
    );
    expect(buyerOrders).toContain("<FilterTabs filters={filterTabs}");
    expect(supplierOrders).toContain("<FilterTabs filters={filterTabs}");
    // Supplier orders has 5 filters — horizontal scroll required.
    expect(supplierOrders).toContain("scrollable");

    // No inline reconstruction of the chip pattern in either screen.
    expect(buyerOrders, "buyer orders should not inline the chip row").not.toMatch(
      /flex-row items-center gap-2 rounded-full px-4 py-2[\s\S]{0,200}isActive \? "bg-primary"/,
    );
    expect(supplierOrders, "supplier orders should not inline the chip row").not.toMatch(
      /flex-row items-center gap-2 rounded-full px-4 py-2[\s\S]{0,200}isActive \? "bg-primary"/,
    );
  });

  it("MetricTile είναι extracted σε shared component (έτοιμο για reuse σε buyer screens)", () => {
    const metricTilePath = path.join(root, "components/ui/metric-tile.tsx");
    expect(existsSync(metricTilePath), "components/ui/metric-tile.tsx should exist").toBe(true);

    const dashboard = readFileSync(path.join(root, "app/(supplier-tabs)/index.tsx"), "utf8");
    expect(dashboard).toContain('import { MetricTile } from "@/components/ui/metric-tile"');
    // No more local redefinition of MetricTile inside the supplier dashboard —
    // the shared component is the only source of truth.
    expect(dashboard).not.toMatch(/^function MetricTile\(/m);
  });

  it("EmptyState είναι extracted σε shared component (DRY — καμία inline dashed card)", () => {
    const emptyStatePath = path.join(root, "components/ui/empty-state.tsx");
    expect(existsSync(emptyStatePath), "components/ui/empty-state.tsx should exist").toBe(true);

    const screensUsingEmptyState = [
      "app/(tabs)/index.tsx",
      "app/(tabs)/orders.tsx",
      "app/(supplier-tabs)/index.tsx",
      "app/(supplier-tabs)/orders.tsx",
    ];

    for (const rel of screensUsingEmptyState) {
      const source = readFileSync(path.join(root, rel), "utf8");
      expect(source, `${rel} should import EmptyState`).toContain(
        'import { EmptyState } from "@/components/ui/empty-state"',
      );
      // The full empty-card pattern (dashed border + icon circle + title) must
      // NOT be reconstructed inline — EmptyState is the only place that owns it.
      expect(source, `${rel} should not reconstruct the dashed empty card inline`).not.toMatch(
        /rounded-\[24px\][^"`]*border-dashed[^"`]*px-4 py-8/,
      );
    }
  });

  it("StatusPill είναι extracted σε shared component (DRY — καμία inline pill markup)", () => {
    const statusPillPath = path.join(root, "components/ui/status-pill.tsx");
    expect(existsSync(statusPillPath), "components/ui/status-pill.tsx should exist").toBe(true);

    const screensUsingPill = [
      "app/(tabs)/index.tsx",
      "app/(tabs)/orders.tsx",
      "app/(supplier-tabs)/index.tsx",
      "app/(supplier-tabs)/orders.tsx",
      "app/order-detail.tsx",
    ];

    for (const rel of screensUsingPill) {
      const source = readFileSync(path.join(root, rel), "utf8");
      expect(source, `${rel} should import StatusPill`).toContain(
        'import { StatusPill } from "@/components/ui/status-pill"',
      );
      // Inline pill reconstruction must NOT come back — the shared component is
      // the only place allowed to render `rounded-full px-3 py-2 + status color`.
      expect(source, `${rel} should not reconstruct the pill inline`).not.toMatch(
        /rounded-full[^"`]*getOrderStatusClasses/,
      );
    }
  });

  it("supplier screens χρησιμοποιούν counterpartyName (κατάστημα-buyer), όχι supplierName", () => {
    const dashboard = readFileSync(path.join(root, "app/(supplier-tabs)/index.tsx"), "utf8");
    const ordersScreen = readFileSync(path.join(root, "app/(supplier-tabs)/orders.tsx"), "utf8");

    expect(dashboard).toContain("order.counterpartyName");
    expect(ordersScreen).toContain("order.counterpartyName");
    expect(dashboard).not.toContain("{order.supplierName}");
    expect(ordersScreen).not.toContain("{order.supplierName}");
  });

  it("supplier orders: φίλτρα ανά κατάσταση με counts και status pills", () => {
    const ordersScreen = readFileSync(path.join(root, "app/(supplier-tabs)/orders.tsx"), "utf8");

    expect(ordersScreen).toContain('useState<SupplierOrderFilter>("new")');
    expect(ordersScreen).toContain('{ key: "new", label: "Νέες" }');
    expect(ordersScreen).toContain('{ key: "processing", label: "Σε επεξεργασία" }');
    expect(ordersScreen).toContain('{ key: "onTheWay", label: "Καθ\' οδόν" }');
    expect(ordersScreen).toContain('{ key: "completed", label: "Ολοκληρωμένες" }');
    expect(ordersScreen).toContain("<StatusPill status={order.status} />");
    expect(ordersScreen).toContain('pathname: "/order-detail", params: { id: order.id }');
  });

  it("buyer account: πραγματικός χρήστης, χωρίς sign-in CTAs, με έξοδο", () => {
    const accountScreen = readFileSync(path.join(root, "app/(tabs)/account.tsx"), "utf8");

    expect(accountScreen).not.toContain("Urban Roast");
    expect(accountScreen).not.toContain('router.push("/sign-in")');
    expect(accountScreen).not.toContain('router.push("/sign-up")');
    expect(accountScreen).not.toContain("Supplier snapshot");
    expect(accountScreen).not.toContain("useSupplierOperationalSummaryQuery");
    expect(accountScreen).toContain("Auth.getUserInfo");
    expect(accountScreen).toContain("Api.signOut");
    expect(accountScreen).toContain("Κατάστημα");
  });

  it("C4b: supplier μπορεί να αλλάξει διαθεσιμότητα προϊόντος με PATCH + optimistic update", () => {
    const queries = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");
    const platform = readFileSync(path.join(root, "platform/app.ts"), "utf8");
    const catalog = readFileSync(path.join(root, "app/(supplier-tabs)/catalog.tsx"), "utf8");

    // PATCH endpoint υπάρχει και είναι role-gated + ownership-gated.
    expect(platform).toContain('app.patch("/api/supplier/products/:id/availability"');
    expect(platform).toContain("existing.supplierId !== listing.id");
    expect(platform).toMatch(/z\.enum\(\["immediate", "limited"\]\)/);

    // CORS επιτρέπει PATCH (αλλιώς preflight αποτυγχάνει στη συσκευή).
    expect(platform).toMatch(/allowMethods:\s*\[[^\]]*"PATCH"/);

    // Mutation hook + optimistic update + rollback + invalidations.
    expect(queries).toContain("export function useToggleSupplierProductAvailabilityMutation");
    expect(queries).toContain('method: "PATCH"');
    expect(queries).toContain("onMutate");
    expect(queries).toContain("onError");
    expect(queries).toContain("cancelQueries");
    // Propagation: buyer-side queries invalidated μετά από toggle.
    expect(queries).toContain('queryKey: ["horeca", "featuredProducts"]');
    expect(queries).toContain('queryKey: ["horeca", "productsBySupplier"]');

    // UI: tap-to-toggle με per-card busy state.
    expect(catalog).toContain("useToggleSupplierProductAvailabilityMutation");
    expect(catalog).toContain("AvailabilityToggle");
    expect(catalog).toContain("pendingProductId");
    expect(catalog).toContain("accessibilityRole=\"button\"");
  });

  it("C4a: supplier catalog τραβάει δικά του προϊόντα από role-gated endpoint", () => {
    const queries = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");
    const platform = readFileSync(path.join(root, "platform/app.ts"), "utf8");
    const catalog = readFileSync(path.join(root, "app/(supplier-tabs)/catalog.tsx"), "utf8");

    // Backend endpoint και μάλιστα gated με role=supplier + ownerUserId.
    expect(platform).toContain('app.get("/api/supplier/products"');
    expect(platform).toMatch(/u\.role !== "supplier"[\s\S]{0,100}Supplier role required/);
    expect(platform).toContain("eq(suppliers.ownerUserId, userId)");
    expect(platform).toContain("availabilityStatus");

    // Client hook + types εκτεθειμένα.
    expect(queries).toContain("export function useSupplierOwnProductsQuery");
    expect(queries).toContain("supplierOwnProducts");
    expect(queries).toContain("export type SupplierOwnProduct");

    // Η οθόνη καταναλώνει το hook και δεν είναι πλέον placeholder.
    expect(catalog).toContain("useSupplierOwnProductsQuery");
    expect(catalog).not.toContain("SupplierCatalogPlaceholderScreen");
    expect(catalog).toContain("Κατάλογος");
    expect(catalog).toContain("Χαμηλό απόθεμα");
  });

  it("welcome: role-aware onboarding με δύο value cards και καθαρά CTAs", () => {
    const welcome = readFileSync(path.join(root, "app/welcome.tsx"), "utf8");

    // Και οι δύο κόσμοι εμφανίζονται σαν value proposition.
    expect(welcome).toContain("Για καταστήματα");
    expect(welcome).toContain("Για προμηθευτές");

    // Concrete benefits (όχι generic marketing copy).
    expect(welcome).toContain("Βρες προμηθευτές και τιμές");
    expect(welcome).toContain("Επανάλαβε τις καθημερινές σου παραγγελίες");
    expect(welcome).toContain("Δες νέες παραγγελίες σε πραγματικό χρόνο");

    // CTAs παραμένουν σταθερά: sign-up, sign-in, demo preview.
    expect(welcome).toContain('router.push("/sign-up")');
    expect(welcome).toContain('router.push("/sign-in")');
    expect(welcome).toContain('router.replace("/(tabs)")');
    expect(welcome).toContain("Ξεκίνα τώρα");
    expect(welcome).toContain("Έχω ήδη λογαριασμό");
  });

  it("index route στέλνει authenticated χρήστες στο σωστό root, αλλιώς welcome", () => {
    const indexRoute = readFileSync(path.join(root, "app/index.tsx"), "utf8");

    expect(indexRoute).toContain("Auth.getUserInfo");
    expect(indexRoute).toContain("navigateAfterHorecaAuth");
    expect(indexRoute).toContain('<Redirect href="/welcome" />');
  });

  it("catalog: κάρτα προϊόντος δεν κόβει τα CTAs — buttons σε δική τους σειρά με flex-1", () => {
    const catalog = readFileSync(path.join(root, "app/catalog.tsx"), "utf8");

    // Το availability pill έχει δικό του row (self-start), άρα δεν μοιράζει
    // πλάτος με τα buttons. Αυτό κλειδώνει το layout fix που έφτιαξε το
    // overflow του «Προσθήκη στο καλάθι».
    expect(catalog).toContain("self-start rounded-full bg-background");

    // Κάθε button έχει flex-1 ώστε να χωράνε ομοιόμορφα σε οποιαδήποτε συσκευή.
    const buttonRow = catalog.match(/<View className="flex-row gap-2">[\s\S]+?<\/View>\s*\)\s*\)}/);
    expect(buttonRow).not.toBeNull();
    const buttonSection = buttonRow?.[0] ?? "";
    expect(buttonSection).toContain("flex-1 rounded-full border");
    expect(buttonSection).toContain("flex-1 rounded-full bg-primary");

    // Shorter CTA text χωράει πάντα στο button. «Προσθήκη στο καλάθι» είχε
    // overflow — τώρα είναι «Στο καλάθι».
    expect(catalog).toContain("Στο καλάθι");
    expect(catalog).not.toContain("Προσθήκη στο καλάθι");
  });

  it("suppliers: filter chips είναι ενεργά με «Όλες» reset + server-side filtering", () => {
    const suppliers = readFileSync(path.join(root, "app/(tabs)/suppliers.tsx"), "utf8");

    // State + handlers — όχι decorative chips.
    expect(suppliers).toContain("useState<string | null>(null)");
    expect(suppliers).toContain("setSelectedCategory(null)");
    expect(suppliers).toContain("setSelectedCategory(category)");

    // Το selection τροφοδοτεί το ίδιο το query (δεν φιλτράρουμε μόνο τοπικά).
    expect(suppliers).toContain("useSuppliersListQuery({");
    expect(suppliers).toContain("category: selectedCategory ?? undefined");

    // «Όλες» reset chip + a11y role για όλα τα chips.
    expect(suppliers).toContain("Όλες");
    expect(suppliers).toContain('accessibilityRole="button"');
    expect(suppliers).toContain("accessibilityState={{ selected:");

    // Active state δεν είναι πια hardcoded στο index === 0.
    expect(suppliers).not.toContain("index === 0");
  });

  it("B2: supplier list χρησιμοποιεί reusable SupplierCard με verified badge & star rating", () => {
    const card = readFileSync(path.join(root, "components/ui/supplier-card.tsx"), "utf8");
    const suppliers = readFileSync(path.join(root, "app/(tabs)/suppliers.tsx"), "utf8");

    // Reusable component με καθαρό contract.
    expect(card).toContain("export function SupplierCard");
    expect(card).toContain("supplier: Supplier");
    expect(card).toContain("onPress: () => void");

    // Visual upgrades: avatar initials, verified badge με Greek copy, star rating,
    // location/delivery/MOQ metadata, κατάληξη CTA.
    expect(card).toContain("getInitials");
    expect(card).toContain("checkmark.seal.fill");
    expect(card).toContain("Εξακριβωμένος");
    // Star icons ζουν στο `StarRating` component πια (DRY) — εδώ ελέγχουμε
    // ότι το card το καταναλώνει.
    expect(card).toContain("<StarRating");
    expect(card).toContain("mappin.and.ellipse");
    expect(card).toContain("Άνοιγμα καταλόγου");

    // Η λίστα καταναλώνει το component — όχι inline duplication.
    expect(suppliers).toContain('from "@/components/ui/supplier-card"');
    expect(suppliers).toContain("<SupplierCard");
    // Το παλιό random «Νέα συνεργασία» badge έχει καθαριστεί.
    expect(suppliers).not.toContain("Νέα συνεργασία");
  });

  it("B2: supplier map — schema, mocks, API και component δουλεύουν end-to-end", () => {
    const schema = readFileSync(path.join(root, "platform/db/schema.ts"), "utf8");
    const mapper = readFileSync(path.join(root, "platform/app.ts"), "utf8");
    const mocks = readFileSync(path.join(root, "lib/mocks/horeca.ts"), "utf8");
    const seed = readFileSync(path.join(root, "scripts/seed-platform.ts"), "utf8");
    const mapComponent = readFileSync(path.join(root, "components/ui/supplier-map.tsx"), "utf8");
    const profile = readFileSync(path.join(root, "app/supplier-profile.tsx"), "utf8");

    // Schema: real columns nullable (backwards compat για legacy suppliers).
    expect(schema).toContain('latitude: real("latitude")');
    expect(schema).toContain('longitude: real("longitude")');

    // API: ο mapSupplierRow διοχετεύει lat/lng μόνο όταν υπάρχουν — διατηρεί
    // καθαρό contract ώστε το client type να μένει optional.
    expect(mapper).toMatch(/s\.latitude !== null && s\.longitude !== null/);

    // Mocks: οι 3 demo suppliers έχουν συντεταγμένες (Αθήνα/Θες/νίκη/Πειραιάς).
    expect(mocks).toContain("latitude?: number");
    expect(mocks).toContain("longitude?: number");
    expect(mocks).toMatch(/latitude: 37\.9838/); // Αθήνα
    expect(mocks).toMatch(/latitude: 40\.636/); // Θεσσαλονίκη
    expect(mocks).toMatch(/latitude: 37\.9375/); // Πειραιάς

    // Seed: περνάει lat/lng στο insert με fallback σε null για υπαρκτά rows.
    expect(seed).toContain("latitude: s.latitude ?? null");
    expect(seed).toContain("longitude: s.longitude ?? null");

    // Component: MapView + Marker από react-native-maps, non-interactive preview,
    // tap-to-open με deep link που διαφοροποιείται ανά platform. Το require
    // είναι defensive ώστε binary χωρίς το pod να μη σκάει (fallback UI).
    expect(mapComponent).toContain('require("react-native-maps")');
    expect(mapComponent).toContain("MapView");
    expect(mapComponent).toContain("Marker");
    expect(mapComponent).toContain("scrollEnabled={false}");
    expect(mapComponent).toContain("zoomEnabled={false}");
    expect(mapComponent).toContain("Linking.openURL");
    expect(mapComponent).toContain("maps://");
    expect(mapComponent).toContain("geo:");
    expect(mapComponent).toContain("Άνοιγμα στους Χάρτες");
    // Defensive fallback: αν λείπει το native module, δείχνουμε placeholder
    // αντί για crash — προστατεύει stale Xcode builds και Expo Go. Ο έλεγχος
    // γίνεται πριν το require μέσω UIManager ώστε να μη σκάσει το native side.
    expect(mapComponent).toContain('UIManager');
    expect(mapComponent).toContain('"AIRMap"');
    expect(mapComponent).toContain("if (!mapModule)");
    expect(mapComponent).toContain("Προβολή στους Χάρτες");

    // Profile: ο χάρτης εμφανίζεται μόνο όταν υπάρχουν coords — δεν δείχνουμε
    // άδειο map section σε legacy suppliers.
    expect(profile).toContain("SupplierMap");
    expect(profile).toContain("supplier.latitude !== undefined && supplier.longitude !== undefined");
  });

  it("B2: supplier profile έχει hero (avatar+verified+rating), 3-stat grid και loading states", () => {
    const profile = readFileSync(path.join(root, "app/supplier-profile.tsx"), "utf8");

    // Hero hierarchy.
    expect(profile).toContain("getInitials");
    expect(profile).toContain("checkmark.seal.fill");
    expect(profile).toContain("Εξακριβωμένος");
    // Star icons ζουν στο `StarRating` component (DRY).
    expect(profile).toContain("<StarRating");

    // 3-stat grid με κανονικά labels.
    expect(profile).toContain("StatTile");
    expect(profile).toContain("Κατηγορία");
    expect(profile).toContain("Παράδοση");
    expect(profile).toContain("MOQ");

    // Loading/empty states — όχι πια σκέτο text fallback.
    expect(profile).toContain("ActivityIndicator");
    expect(profile).toContain("supplierLoading");
    expect(profile).toContain("productsLoading");
    expect(profile).toContain("Ο προμηθευτής δεν βρέθηκε.");
    expect(profile).toContain("Ο προμηθευτής δεν έχει δημοσιεύσει ακόμη προϊόντα.");

    // Section title ευθυγραμμίζεται με το νέο scope (πλήρης κατάλογος, όχι «ενδεικτικά»).
    expect(profile).toContain("Κατάλογος προμηθευτή");
    expect(profile).not.toContain("Ενδεικτικά προϊόντα");
  });

  it("C4c: supplier μπορεί να δημιουργήσει/επεξεργαστεί/διαγράψει προϊόν μέσω role-gated endpoints", () => {
    const platform = readFileSync(path.join(root, "platform/app.ts"), "utf8");
    const queries = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");
    const form = readFileSync(path.join(root, "app/supplier-product-form.tsx"), "utf8");
    const catalog = readFileSync(path.join(root, "app/(supplier-tabs)/catalog.tsx"), "utf8");

    // === Backend: 3 routes + shared gate helper με σωστό role/ownership check ===
    expect(platform).toContain('app.post("/api/supplier/products"');
    expect(platform).toContain('app.patch("/api/supplier/products/:id"');
    expect(platform).toContain('app.delete("/api/supplier/products/:id"');
    expect(platform).toContain("requireSupplierStorefront");
    // Supplier role guard είναι στο helper, οπότε ελέγχουμε εκεί.
    expect(platform).toMatch(/u\.role !== "supplier"[\s\S]{0,150}Supplier role required/);
    // Ownership guard σε update & delete — χρησιμοποιούν existing.supplierId !== auth.listing.id.
    const ownershipGuards = platform.match(/existing\.supplierId !== auth\.listing\.id/g) ?? [];
    expect(ownershipGuards.length).toBeGreaterThanOrEqual(2);
    // Zod validation: price regex + max lengths.
    expect(platform).toContain("productPriceField");
    expect(platform).toContain("/^\\d+(\\.\\d{1,2})?$/");
    // DELETE επιστρέφει 204 No Content.
    expect(platform).toMatch(/app\.delete\([\s\S]*?c\.body\(null, 204\)/);

    // === Client hooks: create + update + delete με invalidations ===
    expect(queries).toContain("export function useCreateSupplierProductMutation");
    expect(queries).toContain("export function useUpdateSupplierProductMutation");
    expect(queries).toContain("export function useDeleteSupplierProductMutation");
    expect(queries).toContain("export type SupplierProductInput");
    // Shared cache invalidation helper (κρατάει τα buyer views sync).
    expect(queries).toContain("invalidateProductCaches");
    // Update & delete κάνουν optimistic update (onMutate + previous snapshot).
    const onMutateOccurrences = (queries.match(/onMutate: async \(input\)/g) ?? []).length;
    expect(onMutateOccurrences).toBeGreaterThanOrEqual(3); // toggle + update + delete

    // === Form screen: validation + delete confirmation ===
    expect(form).toContain("useCreateSupplierProductMutation");
    expect(form).toContain("useUpdateSupplierProductMutation");
    expect(form).toContain("useDeleteSupplierProductMutation");
    expect(form).toContain("PRICE_REGEX");
    expect(form).toContain("Alert.alert"); // delete confirmation
    expect(form).toContain("\"destructive\"");
    // Segmented control για availability (πριν το submit).
    expect(form).toContain("SegmentedOption");
    expect(form).toContain("accessibilityState={{ selected");

    // === Catalog screen wiring ===
    expect(catalog).toContain('router.push("/supplier-product-form")');
    expect(catalog).toContain('pathname: "/supplier-product-form"');
    expect(catalog).toContain("Νέο προϊόν");
    expect(catalog).toContain("Επεξεργασία");
  });

  it("S1: backend subscription schema + endpoints με lazy auto-create", () => {
    const schema = readFileSync(path.join(root, "platform/db/schema.ts"), "utf8");
    const platform = readFileSync(path.join(root, "platform/app.ts"), "utf8");
    const seed = readFileSync(path.join(root, "scripts/seed-platform.ts"), "utf8");

    // Table με unique userId (1-to-1) + cascade delete.
    expect(schema).toContain('export const subscriptions = sqliteTable(');
    expect(schema).toMatch(/userId: integer\("user_id"\)[\s\S]{0,120}\.unique\(\)/);
    expect(schema).toContain('onDelete: "cascade"');
    expect(schema).toContain("type SubscriptionRow");

    // Public endpoint + dev-only activate/cancel. Το prod guard τα σκοτώνει
    // όταν NODE_ENV === production — δεν χρειάζεται να κάνουμε ξεχωριστό
    // ssl check στο test αφού ο path assertion επιβεβαιώνει την ύπαρξη.
    expect(platform).toContain('app.get("/api/me/subscription"');
    expect(platform).toContain('app.post("/api/dev/subscription/activate"');
    expect(platform).toContain('app.post("/api/dev/subscription/cancel"');
    expect(platform).toContain("assertDevEnv");
    expect(platform).toContain("getOrCreateSubscription");

    // Auto-enroll στο register ώστε κάθε user να έχει row. Το insert γίνεται
    // πια μέσα σε transaction (Φάση 0.6 atomicity) με multiline chained calls,
    // οπότε ψάχνουμε το full pattern με tolerant whitespace/newlines και
    // αποδεχόμαστε είτε `db|tx` builder είτε `row|userRow` identifier.
    expect(platform).toMatch(
      /(?:db|tx)\s*\.insert\(subscriptions\)\s*\.values\(\{\s*userId:\s*(?:row|userRow)\.id,\s*plan:\s*"free"/,
    );

    // Seed επίσης δίνει rows και στα demo accounts.
    expect(seed).toContain("db.delete(subscriptions)");
    expect(seed).toMatch(/subscriptions[\s\S]*buyer\.id[\s\S]*plan: "free"/);
  });

  it("S2: client subscription module εκθέτει query, mutations και features helper", () => {
    const sub = readFileSync(path.join(root, "lib/subscription.ts"), "utf8");

    expect(sub).toContain("export function useSubscriptionQuery");
    expect(sub).toContain("export function useActivateProMutation");
    expect(sub).toContain("export function useCancelSubscriptionMutation");
    expect(sub).toContain("export function useFeatures");
    expect(sub).toContain("export function getFeaturesForSubscription");

    // Single source of truth για tier limits — ολόκληρο το αρχικό matrix
    // (model A, 2 tiers) πρέπει να αντανακλάται σε FeatureSet keys.
    expect(sub).toContain("maxOrdersPerMonth");
    expect(sub).toContain("maxSavedSuppliers");
    expect(sub).toContain("maxLocations");
    expect(sub).toContain("maxTeamSeats");
    expect(sub).toContain("historyWindowDays");
    expect(sub).toContain("canExportHistory");
    expect(sub).toContain("canSetPriceAlerts");
    expect(sub).toContain("canCompareCosts");
    expect(sub).toContain("prioritySupport");

    // Free limits — όχι «απεριόριστα» πουθενά εκτός όπου ορίστηκε ρητά.
    expect(sub).toMatch(/maxOrdersPerMonth: 10/);
    expect(sub).toMatch(/maxSavedSuppliers: 3/);
    expect(sub).toMatch(/maxLocations: 1/);
    expect(sub).toMatch(/maxTeamSeats: 1/);
    expect(sub).toMatch(/historyWindowDays: 30/);

    // Pro limits — multi-location 5, team seats 5, υπόλοιπα Infinity/true.
    expect(sub).toMatch(/maxLocations: 5/);
    expect(sub).toMatch(/maxTeamSeats: 5/);

    // 2 tiers exactly — το PLAN_CATALOG πρέπει να έχει free + pro.
    expect(sub).toContain('id: "free"');
    expect(sub).toContain('id: "pro"');
    expect(sub).toContain("10 παραγγελίες");
    expect(sub).toContain("Συγκριτικά κόστους");

    // Auth fallback: αν 401/403, ο client επιστρέφει default free αντί να σκάσει.
    expect(sub).toContain("DEFAULT_FREE_SUBSCRIPTION");
    expect(sub).toMatch(/e\.status === 401 \|\| e\.status === 403/);
  });

  it("S3: subscription screen + buyer account integration", () => {
    const screen = readFileSync(path.join(root, "app/subscription.tsx"), "utf8");
    const account = readFileSync(path.join(root, "app/(tabs)/account.tsx"), "utf8");

    // Plan comparison + billing cycle toggle.
    expect(screen).toContain("PLAN_CATALOG");
    expect(screen).toContain("BillingCycleToggle");
    expect(screen).toContain("Μηνιαίο");
    expect(screen).toContain("Ετήσιο");

    // Upgrade + cancel wired σε mutations (όχι direct fetch).
    expect(screen).toContain("useActivateProMutation");
    expect(screen).toContain("useCancelSubscriptionMutation");
    // Cancel χρησιμοποιεί destructive alert για consent.
    expect(screen).toContain('"destructive"');

    // Buyer account δείχνει πραγματικό plan badge + link στη συνδρομή.
    expect(account).toContain("useSubscriptionQuery");
    expect(account).toContain('router.push("/subscription")');
    expect(account).toContain("SubscriptionCard");
  });

  it("S4: feature gating — GatedAction + εξαγωγή ιστορικού κλειδωμένο στο free", () => {
    const gated = readFileSync(path.join(root, "components/ui/gated-action.tsx"), "utf8");
    const orders = readFileSync(path.join(root, "app/(tabs)/orders.tsx"), "utf8");

    // Η gating απόφαση παίρνεται μέσα στο component από το features helper —
    // έτσι δεν γράφουμε if/else σε κάθε screen.
    expect(gated).toContain("useFeatures");
    expect(gated).toContain("features[feature]");
    // Unlocked → calls callback. Locked → paywall redirect σε /subscription.
    expect(gated).toContain("onUnlockedPress()");
    expect(gated).toContain('router.push("/subscription")');
    // Visual Pro badge μόνο όταν locked.
    expect(gated).toMatch(/!isUnlocked[\s\S]{0,600}Pro</);

    // Pilot: orders tab διαθέτει εξαγωγή ιστορικού πίσω από canExportHistory.
    expect(orders).toContain('feature="canExportHistory"');
    expect(orders).toContain("Εξαγωγή ιστορικού");
  });

  it("χρησιμοποιεί standard SafeAreaProvider wiring στο root layout", () => {
    const rootLayout = readFileSync(path.join(root, "app/_layout.tsx"), "utf8");

    expect(rootLayout).toContain('import "../global.css";');
    expect(rootLayout).toContain("<SafeAreaProvider initialMetrics={providerInitialMetrics}>");
    expect(rootLayout).not.toContain("subscribeSafeAreaInsets");
    expect(rootLayout).not.toContain("SafeAreaFrameContext.Provider");
    expect(rootLayout).not.toContain("SafeAreaInsetsContext.Provider");
  });

  // ─── Phase 0.1: Cart state ────────────────────────────────────────────────

  describe("Phase 0.1 — cart state", () => {
    const itemA: CartItemInput = {
      productId: "1",
      supplierId: "1",
      supplierName: "Aegean Coffee Trade",
      productName: "Brazil Santos Espresso Blend",
      unit: "1 κιλό",
      priceEur: 18.9,
    };
    const itemB: CartItemInput = {
      productId: "2",
      supplierId: "2",
      supplierName: "Fresh Roots Market",
      productName: "Ντομάτα αποφλοιωμένη κονκασέ",
      unit: "5 κιλά",
      priceEur: 10.4,
    };
    const itemC: CartItemInput = {
      productId: "4",
      supplierId: "1",
      supplierName: "Aegean Coffee Trade",
      productName: "Colombian Single Origin Supremo",
      unit: "250 γρ.",
      priceEur: 9.8,
    };
    const empty: CartState = { items: [] };

    it("applyAddItem προσθέτει νέο row σε άδειο cart", () => {
      const next = applyAddItem(empty, itemA, 2, 1_000);
      expect(next.items).toHaveLength(1);
      expect(next.items[0]).toMatchObject({ productId: "1", qty: 2, priceEur: 18.9, addedAt: 1_000 });
    });

    it("applyAddItem αυξάνει qty υπάρχοντος row αντί να δημιουργεί διπλό", () => {
      const after1 = applyAddItem(empty, itemA, 1, 1_000);
      const after2 = applyAddItem(after1, itemA, 3, 2_000);
      expect(after2.items).toHaveLength(1);
      expect(after2.items[0]?.qty).toBe(4);
      // Δεν αλλάζει το addedAt — η αρχική στιγμή προσθήκης παραμένει για sort.
      expect(after2.items[0]?.addedAt).toBe(1_000);
    });

    it("applyAddItem με qty<=0 δεν αλλάζει state (no-op)", () => {
      const after = applyAddItem(empty, itemA, 0, 1_000);
      expect(after).toBe(empty);
    });

    it("applySetItemQty κάνει update· qty<=0 αφαιρεί το item", () => {
      const start = applyAddItem(empty, itemA, 5, 1_000);
      const updated = applySetItemQty(start, "1", 8);
      expect(updated.items[0]?.qty).toBe(8);
      const removed = applySetItemQty(updated, "1", 0);
      expect(removed.items).toHaveLength(0);
    });

    it("applyRemoveItem αφαιρεί το συγκεκριμένο productId", () => {
      const start = applyAddItem(applyAddItem(empty, itemA, 1, 1), itemB, 2, 2);
      const after = applyRemoveItem(start, "1");
      expect(after.items.map((i) => i.productId)).toEqual(["2"]);
    });

    it("applyClearBySupplier σβήνει μόνο τα items του ίδιου supplier", () => {
      const start = applyAddItem(
        applyAddItem(applyAddItem(empty, itemA, 1, 1), itemB, 1, 2),
        itemC,
        1,
        3,
      );
      const after = applyClearBySupplier(start, "1");
      expect(after.items).toHaveLength(1);
      expect(after.items[0]?.supplierId).toBe("2");
    });

    it("selectors υπολογίζουν totals & grouping", () => {
      const state = applyAddItem(
        applyAddItem(applyAddItem(empty, itemA, 2, 1), itemB, 3, 2),
        itemC,
        1,
        3,
      );
      // Items: A(2×18.9=37.8) + B(3×10.4=31.2) + C(1×9.8=9.8) = 78.80
      expect(selectItemCount(state)).toBe(3);
      expect(selectTotalQty(state)).toBe(6);
      expect(selectTotalEur(state)).toBeCloseTo(78.8, 2);

      const groups = selectGroupedBySupplier(state);
      const supplier1 = groups.find((g) => g.supplierId === "1");
      const supplier2 = groups.find((g) => g.supplierId === "2");
      expect(supplier1).toBeDefined();
      expect(supplier2).toBeDefined();
      expect(supplier1?.items).toHaveLength(2);
      // 2×18.9 + 1×9.8 = 47.6
      expect(supplier1?.subtotalEur).toBeCloseTo(47.6, 2);
      expect(supplier2?.subtotalEur).toBeCloseTo(31.2, 2);
    });
  });

  it("Phase 0.1: cart store wires στο AsyncStorage + zustand persist", () => {
    const store = readFileSync(path.join(root, "lib/cart-store.ts"), "utf8");
    // Persistence via το official zustand middleware + AsyncStorage.
    expect(store).toContain('from "zustand"');
    expect(store).toContain("createJSONStorage");
    expect(store).toContain("@react-native-async-storage/async-storage");
    expect(store).toContain('name: "horeca-cart-v1"');
    // Όλη η state-mutation λογική περνά από τα pure helpers — single source
    // of truth για cart math, testable χωρίς RN stack.
    expect(store).toContain('from "@/lib/cart-selectors"');
    expect(store).toContain("applyAddItem");
    expect(store).toContain("applySetItemQty");
    expect(store).toContain("applyRemoveItem");
    // Public surface διατηρείται μέσω re-exports ώστε τα UI imports να
    // χρειάζονται ένα μόνο entry point.
    expect(store).toContain("export {");
    expect(store).toContain("selectGroupedBySupplier");
  });

  it("Phase 0.1: cart screen χρησιμοποιεί real state + empty state + grouping", () => {
    const cart = readFileSync(path.join(root, "app/cart.tsx"), "utf8");
    // Δεν υπάρχουν πλέον hardcoded names στο cart — όλα έρχονται από το store.
    expect(cart).not.toContain("Brazil Santos Espresso Blend");
    expect(cart).not.toContain("Ποτήρι χάρτινο διπλό 12oz");
    expect(cart).toContain("useCartStore");
    expect(cart).toContain("selectGroupedBySupplier");
    expect(cart).toContain("EmptyState");
    // Σαφή B2B copy ότι κάθε supplier = ξεχωριστή παραγγελία.
    expect(cart).toContain("ξεχωριστή παραγγελία");
  });

  it("Phase 0.1: product detail προσθέτει στο καλάθι μέσω cart store", () => {
    const detail = readFileSync(path.join(root, "app/product-detail.tsx"), "utf8");
    expect(detail).toContain("QtyStepper");
    // Phase 1.2: το store παραμένει για read state (cartQtyForProduct), αλλά
    // οι mutations έχουν περάσει στο cart-sync.
    expect(detail).toContain("useCartStore");
    expect(detail).toContain("syncedAddItem");
    // Το CTA περιέχει cart-aware label με live total — προσθέτει feedback.
    expect(detail).toContain("Προσθήκη στο καλάθι");
    expect(detail).toContain("formatEur(lineTotal)");
    expect(detail).toContain("priceEur: product.priceEur");
  });

  it("Phase 0.1: catalog quick-add συνδέει «Στο καλάθι» button με store", () => {
    const catalog = readFileSync(path.join(root, "app/catalog.tsx"), "utf8");
    // Phase 1.2: ο catalog δεν χρειάζεται πια read state από το store, μόνο
    // το mutate. Άρα import μόνο για το synced wrapper.
    expect(catalog).toContain("syncedAddItem");
    // Αντικαθιστά το παλιό inert button που απλά έκανε router.push.
    expect(catalog).not.toMatch(/router\.push\(['"]\/cart['"]\)\s*\}\s*className="flex-1 rounded-full bg-primary/);
  });

  it("Phase 0.1: CartSummaryBar mounted σε όλες τις buyer browsing οθόνες", () => {
    const screens = [
      "app/(tabs)/index.tsx",
      "app/(tabs)/suppliers.tsx",
      "app/catalog.tsx",
      "app/supplier-profile.tsx",
    ];
    for (const rel of screens) {
      const src = readFileSync(path.join(root, rel), "utf8");
      expect(src, `${rel} should mount CartSummaryBar`).toContain("CartSummaryBar");
    }
    // Στο cart & checkout screen ΔΕΝ θέλουμε CartSummaryBar (θα γινόταν διπλό CTA).
    const cartSrc = readFileSync(path.join(root, "app/cart.tsx"), "utf8");
    const checkoutSrc = readFileSync(path.join(root, "app/checkout.tsx"), "utf8");
    expect(cartSrc).not.toContain("CartSummaryBar");
    expect(checkoutSrc).not.toContain("CartSummaryBar");
  });

  it("Phase 0.1: buyer-side product API εκθέτει priceEur (number) για cart math", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");
    // Το mapProductRow πρέπει να εκθέτει και formatted price ΚΑΙ raw number.
    expect(src).toMatch(/price: formatEur\(p\.priceEur\)/);
    expect(src).toMatch(/priceEur: Number\(p\.priceEur\)/);
    // Ο client Product type αντικατοπτρίζει το ίδιο contract.
    const mock = readFileSync(path.join(root, "lib/mocks/horeca.ts"), "utf8");
    expect(mock).toMatch(/priceEur: number/);
  });

  // ─── Phase 0.2: POST /api/orders ──────────────────────────────────────────

  it("Phase 0.2: schema περιλαμβάνει order_items πίνακα με snapshot fields", () => {
    const schema = readFileSync(path.join(root, "platform/db/schema.ts"), "utf8");
    // Νέος πίνακας με denormalized snapshot — απαραίτητο για audit trail.
    expect(schema).toContain('export const orderItems = sqliteTable(');
    expect(schema).toContain('"order_items"');
    expect(schema).toMatch(/orderId.*references\(\(\) => orders\.id, \{ onDelete: "cascade" \}\)/s);
    expect(schema).toMatch(/productId.*references\(\(\) => products\.id\)/s);
    expect(schema).toContain('productName: text("product_name").notNull()');
    expect(schema).toContain('unitPriceEur: text("unit_price_eur").notNull()');
    expect(schema).toContain('qty: integer("qty").notNull()');
    expect(schema).toContain('lineTotalEur: text("line_total_eur").notNull()');
    // Relations για να μπορεί η order-detail να φέρει items.
    expect(schema).toContain("orderItemsRelations");
    expect(schema).toContain("items: many(orderItems)");
    // Το orders κρατά πλέον και optional notes πεδίο.
    expect(schema).toContain('notes: text("notes")');
    // Export type ώστε ο server-side code να έχει type safety.
    expect(schema).toContain("export type OrderItemRow");
  });

  it("Phase 0.2: POST /api/orders endpoint υπάρχει με zero-trust totals", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    // Endpoint declared
    expect(src).toMatch(/app\.post\("\/api\/orders",\s*async/);

    // Zod validation με όρια — supplierId positive int, items 1..50, qty 1..9999
    expect(src).toContain("createOrderBody");
    expect(src).toMatch(/items: z\.array\(createOrderItemBody\)\.min\(1\)/);
    expect(src).toMatch(/productId: z\.number\(\)\.int\(\)\.positive\(\)/);
    expect(src).toMatch(/qty: z\.number\(\)\.int\(\)\.positive\(\)\.max\(9999\)/);

    // Role guard — μόνο buyer φτιάχνει orders
    expect(src).toMatch(/u\.role !== "buyer"/);
    expect(src).toContain("Only buyers can place orders");

    // Zero-trust totals: ο server διαβάζει priceEur από DB, ΟΧΙ από payload
    expect(src).toMatch(/unitPrice = Number\(p\.priceEur\)/);
    expect(src).toMatch(/lineTotal = unitPrice \* qty/);
    expect(src).toMatch(/totalEur \+= lineTotal/);

    // Duplicate guard — δεν επιτρέπουμε διπλό productId
    expect(src).toContain("Duplicate productId in items");

    // Cross-supplier guard — όλα τα products πρέπει να ανήκουν στον supplier
    expect(src).toContain("Product does not belong to supplier");

    // Single batched query (αποφυγή N+1) με inArray
    expect(src).toMatch(/inArray\(products\.id, productIds\)/);

    // Transaction — order + items γίνονται ατομικά
    expect(src).toMatch(/await db\.transaction\(async \(tx\) => /);

    // PublicId με crypto.randomUUID, όχι sequential predictable id
    expect(src).toContain("generateOrderPublicId");
    expect(src).toMatch(/randomUUID\(\)\.slice\(0, 8\)/);

    // 201 status για create
    expect(src).toMatch(/201/);
  });

  it("Phase 0.2: seed δημιουργεί realistic line items + recalculated totals", () => {
    const seed = readFileSync(path.join(root, "scripts/seed-platform.ts"), "utf8");

    // Νέα τμήματα του seed για order items
    expect(seed).toContain("orderItems");
    expect(seed).toContain("supplierProducts");
    // Totals υπολογίζονται από line items (όχι από mock totals)
    expect(seed).toMatch(/total\s*=\s*lines\.reduce/);
    expect(seed).toMatch(/totalEur: total\.toFixed\(2\)/);
    // Items insertion περιλαμβάνει snapshot fields
    expect(seed).toMatch(/productName: p\.name/);
    expect(seed).toMatch(/unitPriceEur: p\.priceEur/);
    expect(seed).toMatch(/lineTotalEur:.*toFixed\(2\)/);
    // Cascade-aware clearing
    expect(seed).toMatch(/await db\.delete\(orderItems\)/);
  });

  // ─── Phase 0.3: Checkout client wiring ─────────────────────────────────────

  it("Phase 0.3: useCreateOrderMutation στέλνει minimal payload + invalidates", () => {
    const src = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");

    expect(src).toContain("export function useCreateOrderMutation");
    // POST στο σωστό endpoint — από Φάση 0.4 το response type ονομάζεται OrderDetail
    // (το ίδιο για create και για GET /api/orders/:publicId).
    expect(src).toMatch(/apiRequest<\{ order: OrderDetail \}>\("\/api\/orders"/);
    expect(src).toMatch(/method:\s*"POST"/);
    // auth: true — το endpoint απαιτεί JWT
    expect(src).toMatch(/auth:\s*true/);
    // Zero-trust: στο payload type ΔΕΝ εκθέτουμε priceEur (μόνο productId + qty)
    expect(src).toContain("export type CreateOrderInput");
    expect(src).toMatch(/items:\s*\{\s*productId:\s*number;\s*qty:\s*number\s*\}\[\]/);
    expect(src).not.toMatch(/CreateOrderInput[\s\S]*priceEur/);
    // Στο success κάνουμε invalidate τις αντίστοιχες order queries
    expect(src).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\["horeca",\s*"recentOrders"\]\s*\}\)/);
    expect(src).toMatch(/invalidateQueries\(\{[\s\S]*horecaQueryKeys\.supplierOperationalSummary/);
  });

  it("Phase 0.3: checkout διαβάζει cart + group-by-supplier + submit handler", () => {
    const src = readFileSync(path.join(root, "app/checkout.tsx"), "utf8");

    // Διαβάζει από το cart store, όχι από mock data
    expect(src).toContain("useCartStore");
    expect(src).toContain("selectGroupedBySupplier");
    expect(src).toContain("selectTotalEur");
    // Χρησιμοποιεί τη mutation
    expect(src).toContain("useCreateOrderMutation");
    expect(src).toMatch(/createOrder\.mutateAsync/);
    // Sequential loop ανά supplier (one-order-per-supplier B2B convention)
    expect(src).toMatch(/for \(const group of groups\)/);
    // Per-supplier clear μόνο όταν το συγκεκριμένο order πετύχει.
    // Phase 1.2: write-through στον server μέσω syncedClearBySupplier.
    expect(src).toContain("syncedClearBySupplier(group.supplierId)");
    // Empty state — defensive όταν cart άδειο
    expect(src).toContain("EmptyState");
    // Στέλνει IDs ως numbers (όπως περιμένει το backend Zod schema)
    expect(src).toMatch(/supplierId:\s*Number\(group\.supplierId\)/);
    expect(src).toMatch(/productId:\s*Number\(i\.productId\)/);
    // Per-supplier notes — διαφορετική οδηγία ανά προμηθευτή
    expect(src).toContain("notesBySupplier");
    expect(src).toMatch(/notes:\s*notesBySupplier\[group\.supplierId\][^\n]*\|\|\s*undefined/);
  });

  // ─── Phase 0.4: GET /api/orders/:publicId + order detail screen ──────────

  it("Phase 0.4: GET /api/orders/:publicId υπάρχει με role-aware 404 isolation", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    expect(src).toMatch(/app\.get\("\/api\/orders\/:publicId",\s*async/);
    // Auth required — 401 για unauthenticated, ΟΧΙ 200 με null
    expect(src).toMatch(/userId = await getAuthUserId\(c\)/);
    expect(src).toMatch(/if \(!userId\) return c\.json\(\{ error: "Unauthorized" \}, 401\)/);

    // Buyer βλέπει μόνο τις δικές του παραγγελίες· supplier μόνο τις δικές του.
    expect(src).toContain("isBuyerOwner");
    expect(src).toContain("isSupplierOwner");
    expect(src).toMatch(/u\.role === "buyer" && row\.order\.buyerId === userId/);
    expect(src).toMatch(/u\.role === "supplier" && row\.supplierOwnerUserId === userId/);

    // Enumeration protection: 404 και για not-found ΚΑΙ για not-authorized,
    // ώστε predictable ord-xxxxxxxx ids να μη διαρρέουν ύπαρξη orders άλλων.
    expect(src).toMatch(/if \(!isBuyerOwner && !isSupplierOwner\)[\s\S]*?Order not found[\s\S]*?404/);

    // Φέρνει line items με snapshot fields που δεν χρειάζεται join σε products.
    expect(src).toMatch(/from\(orderItems\)/);
    expect(src).toMatch(/where\(eq\(orderItems\.orderId, row\.order\.id\)\)/);
    expect(src).toContain("productName: it.productName");
    expect(src).toContain("unitPriceEur: Number(it.unitPriceEur)");
    expect(src).toContain("lineTotalEur: Number(it.lineTotalEur)");

    // counterpartyName flip — role-agnostic UI σε ένα endpoint.
    expect(src).toMatch(/counterpartyName: u\.role === "supplier" \? row\.buyerName : row\.supplierName/);

    // Notes & createdAt εκτίθενται για detail screen.
    expect(src).toContain("notes: row.order.notes");
    expect(src).toContain("createdAt: row.order.createdAt");
  });

  it("Phase 0.4: useOrderQuery handles disabled state, 404, και prepopulation", () => {
    const src = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");

    // Hook export
    expect(src).toContain("export function useOrderQuery");
    // Disabled αν δεν έχουμε publicId (deep-link guard)
    expect(src).toMatch(/enabled: Boolean\(publicId\)/);
    // 404 → null (όχι throw), αλλιώς re-throw για error boundary
    expect(src).toMatch(/e\.status === 404[\s\S]*?return null/);
    // URL-encoded ώστε ασφαλώς σπαστά publicIds να μην σπάσουν το route
    expect(src).toMatch(/encodeURIComponent\(publicId!\)/);

    // Query key per-id για cache reuse
    expect(src).toContain("orderById: (publicId: string)");

    // Mutation prepopulates το detail cache για instant νavigation μετά create
    expect(src).toMatch(/setQueryData\(horecaQueryKeys\.orderById\(order\.publicId\), order\)/);
  });

  it("Phase 0.4: order-detail screen χρησιμοποιεί useOrderQuery + real items", () => {
    const src = readFileSync(path.join(root, "app/order-detail.tsx"), "utf8");

    // Όχι πια filter πάνω στο recentOrders list
    expect(src).not.toContain("useRecentOrdersQuery");
    expect(src).toContain("useOrderQuery");
    expect(src).toMatch(/useOrderQuery\(\{ publicId: id \}\)/);

    // Render line items (όχι μόνο aggregate count)
    expect(src).toContain("OrderItemsCard");
    expect(src).toContain("item.productName");
    expect(src).toContain("item.lineTotal");

    // Notes section μόνο αν υπάρχουν
    expect(src).toMatch(/order\.notes\?\.trim\(\)/);

    // Loading + not-found states ξεχωριστά
    expect(src).toContain("ActivityIndicator");
    expect(src).toContain("EmptyState");
  });

  it("Phase 0.4: reorder CTA πιάνει όλο το order με σωστά cart snapshot fields", () => {
    const src = readFileSync(path.join(root, "app/order-detail.tsx"), "utf8");

    expect(src).toContain("handleRepeat");
    expect(src).toMatch(/for \(const item of order\.items\)/);
    // Add to cart με τα denormalized snapshot fields του order item
    expect(src).toMatch(/productName: item\.productName/);
    expect(src).toMatch(/priceEur: item\.unitPriceEur/);
    // Supplier context μεταφέρεται από το order top-level
    expect(src).toMatch(/supplierId: order\.supplierId/);
    expect(src).toMatch(/supplierName: order\.supplierName/);
    // Quantity = το αρχικό qty της γραμμής.
    // Phase 1.2: syncedAddItem (write-through) αντί για raw store action.
    expect(src).toMatch(/syncedAddItem\([\s\S]*?item\.qty[\s\S]*?\)/);
    // Cross-supplier UX hint αν υπάρχουν ήδη items από άλλους
    expect(src).toMatch(/otherSuppliers\.length > 0/);
  });

  // ─── Phase 0.7: Supplier profile edit ────────────────────────────────────

  it("Phase 0.7: GET + PATCH /api/supplier/profile υπάρχουν με zod refine guard", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    expect(src).toMatch(/app\.get\("\/api\/supplier\/profile",\s*async/);
    expect(src).toMatch(/app\.patch\("\/api\/supplier\/profile",\s*async/);

    // Επαναχρησιμοποιεί τον υπάρχοντα auth+storefront resolver
    expect(src).toMatch(/await requireSupplierStorefront\(c\)/);

    // Zod schema με optional fields + refine για «τουλάχιστον ένα»
    expect(src).toContain("updateSupplierProfileBody");
    expect(src).toMatch(/name: supplierProfileName\.optional\(\)/);
    expect(src).toMatch(/category: supplierProfileCategory\.optional\(\)/);
    expect(src).toMatch(/location: supplierProfileLocation\.optional\(\)/);
    expect(src).toMatch(/deliveryTime: supplierProfileDeliveryTime\.optional\(\)/);
    expect(src).toMatch(/minimumOrder: supplierProfileMinimumOrder\.optional\(\)/);
    expect(src).toMatch(/highlight: supplierProfileHighlight\.optional\(\)/);
    expect(src).toMatch(/refine\(\(val\) => Object\.values\(val\)\.some/);

    // Read-only fields ΔΕΝ εκτίθενται στο update body — κρίσιμο για να μη
    // μπορεί ο supplier να αυτο-«verify»-άρει ή να φτιάξει ratings.
    expect(src).not.toMatch(/verified: supplierProfile/);
    expect(src).not.toMatch(/rating: supplierProfile/);

    // Partial update με conditional spreads — undefined fields δεν στέλνονται
    // στο set, οπότε δεν επανα-ορίζουμε unchanged values.
    expect(src).toMatch(/\.\.\.\(patch\.name !== undefined \? \{ name: patch\.name \} : \{\}\)/);
  });

  it("Phase 0.7: useSupplierProfileQuery + mutation με σωστά cache invalidations", () => {
    const src = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");

    expect(src).toContain("export function useSupplierProfileQuery");
    expect(src).toContain("export function useUpdateSupplierProfileMutation");
    expect(src).toContain("export type UpdateSupplierProfileInput");

    // 401/403/404 → null (όχι throw) ώστε το screen να δείξει empty state
    expect(src).toMatch(/e\.status === 401 \|\| e\.status === 403 \|\| e\.status === 404[\s\S]*?return null/);

    // Mutation: PATCH method, auth, στέλνει partial input
    expect(src).toMatch(/method:\s*"PATCH"/);
    expect(src).toMatch(/JSON\.stringify\(input\)/);

    // setQueryData στο own-profile cache + στο per-id cache (buyer-side reuse)
    expect(src).toMatch(/setQueryData\(horecaQueryKeys\.supplierProfile, supplier\)/);
    expect(src).toMatch(/setQueryData\(horecaQueryKeys\.supplierById\(supplierId\), supplier\)/);

    // Invalidate suppliers list + categories + supplier own products (header name)
    expect(src).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\["horeca",\s*"suppliers"\]\s*\}\)/);
    expect(src).toMatch(/invalidateQueries\(\{[\s\S]*horecaQueryKeys\.supplierCategories/);
    expect(src).toMatch(/invalidateQueries\(\{[\s\S]*horecaQueryKeys\.supplierOwnProducts/);
  });

  it("Phase 0.7: edit screen φτιάχνει form, στέλνει μόνο diff, αλλιώς δείχνει «καμία αλλαγή»", () => {
    const src = readFileSync(path.join(root, "app/supplier-profile-edit.tsx"), "utf8");

    expect(src).toContain("useSupplierProfileQuery");
    expect(src).toContain("useUpdateSupplierProfileMutation");
    expect(src).toContain("useSupplierCategoriesQuery");

    // buildPatch περιορίζει το payload σε αλλαγμένα fields μόνο
    expect(src).toContain("buildPatch");
    expect(src).toMatch(/next\.length > 0 && next !== initialState\[key\]/);
    expect(src).toMatch(/Καμία αλλαγή/);

    // Empty required guard στο client — μην πετάμε σε zod error για κάτι
    // που μπορούμε να φιλτράρουμε νωρίτερα
    expect(src).toMatch(/blankRequired/);
    expect(src).toMatch(/Συμπλήρωσε όλα τα πεδία/);

    // Field limits ταιριάζουν με το server zod schema
    expect(src).toMatch(/name:\s*120/);
    expect(src).toMatch(/category:\s*40/);
    expect(src).toMatch(/highlight:\s*160/);

    // Save button disabled αν δεν υπάρχουν αλλαγές ή αν είναι σε flight
    expect(src).toMatch(/disabled=\{isBusy \|\| !hasChanges\}/);
    expect(src).toContain("ActivityIndicator");
  });

  it("Phase 0.7: supplier account tab δίνει CTA για profile edit", () => {
    const src = readFileSync(path.join(root, "app/(supplier-tabs)/account.tsx"), "utf8");
    expect(src).toMatch(/router\.push\("\/supplier-profile-edit"\)/);
    // Σταθερό label const ώστε αν αλλάξει το text να γίνει σε ένα σημείο
    expect(src).toContain("BTN_EDIT_PROFILE");
  });

  // ─── Phase 0.6: Auto-create supplier storefront at register ─────────────

  it("Phase 0.6: register flow ορίζει NEW_SUPPLIER_DEFAULTS με placeholder values", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    expect(src).toContain("NEW_SUPPLIER_DEFAULTS");
    // Όλα τα required fields του suppliers schema καλύπτονται από defaults
    // (αν προστεθεί νέο NOT NULL column, αυτό το test θα μας υπενθυμίσει
    // να ενημερώσουμε τα defaults).
    expect(src).toMatch(/category:\s*"\\u039b\\u03bf\\u03b9\\u03c0/);
    expect(src).toMatch(/location:\s*"\\u0394\\u03b5\\u03bd /);
    expect(src).toMatch(/deliveryTime:\s*"\\u0395\\u03c0\\u03b9/);
    expect(src).toMatch(/minimumOrder:\s*"\\u03a7\\u03c9\\u03c1/);
    expect(src).toMatch(/highlight:\s*\n?\s*"\\u039d\\u03ad/);
  });

  it("Phase 0.6: register τρέχει σε transaction (user + subscription + storefront)", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    // Όλα τα 3 inserts γίνονται μέσα σε ένα atomic transaction — αν σκάσει
    // οποιοδήποτε, κανένα ορφανό record (πχ user χωρίς subscription).
    expect(src).toMatch(/await db\.transaction\(async \(tx\) => /);
    expect(src).toMatch(/tx\s*\.insert\(users\)/);
    expect(src).toMatch(/tx\s*\.insert\(subscriptions\)/);
    expect(src).toMatch(/tx\s*\.insert\(suppliers\)/);

    // Το insert του storefront γίνεται **μόνο** για suppliers — buyers δεν
    // πρέπει να αποκτούν ψεύτικο storefront row.
    expect(src).toMatch(/if \(userRow\.role === "supplier"\)/);
  });

  it("Phase 0.6: το νέο supplier storefront ξεκινά rating=0 + verified=false", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    // Honest signals: μηδέν reviews, μη verified — η UI μπορεί αργότερα να
    // δείξει «Νέος» badge βασισμένη σε αυτά (Phase 0.7+).
    expect(src).toMatch(/rating:\s*0,\s*\n[\s\S]*?deliveryTime: NEW_SUPPLIER_DEFAULTS\.deliveryTime/);
    expect(src).toMatch(/verified:\s*false,/);
    // Owner is the user we just created (το foundation για όλα τα role-aware
    // queries που φιλτράρουν με ownerUserId).
    expect(src).toMatch(/ownerUserId:\s*userRow\.id,/);
    // Το `name` του storefront παίρνει την επωνυμία της επιχείρησης που έδωσε
    // ο χρήστης στο sign-up — όχι ξεχωριστό field.
    expect(src).toMatch(/name:\s*userRow\.name,/);
  });

  it("Phase 0.6: register response εκθέτει supplier=null για buyers, mapSupplierRow για suppliers", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    // Το response shape είναι additive: παλιοί clients (που δεν διαβάζουν
    // `supplier`) δεν σπάνε.
    expect(src).toMatch(/supplier: result\.supplierRow \? mapSupplierRow\(result\.supplierRow\) : null/);

    // Το user payload παραμένει ίδιο shape με πριν — backwards compat.
    expect(src).toMatch(/openId: `user:\$\{result\.userRow\.id\}`/);
    expect(src).toMatch(/loginMethod: "email"/);
  });

  // ─── Phase 0.5: Status transitions (Accept / Reject / Mark Delivered) ────

  it("Phase 0.5: backend ορίζει state machine + cancelled label/style", () => {
    const platformSrc = readFileSync(path.join(root, "platform/app.ts"), "utf8");
    const formatSrc = readFileSync(path.join(root, "platform/lib/format.ts"), "utf8");
    const stylesSrc = readFileSync(path.join(root, "lib/order-status-styles.ts"), "utf8");
    const mockSrc = readFileSync(path.join(root, "lib/mocks/horeca.ts"), "utf8");

    // Allowed transitions είναι κεντρικά — ένα σημείο αλήθειας.
    expect(platformSrc).toContain("ALLOWED_STATUS_TRANSITIONS");
    expect(platformSrc).toMatch(/new:\s*\["processing",\s*"cancelled"\]/);
    expect(platformSrc).toMatch(/processing:\s*\["in_transit",\s*"completed"\]/);
    expect(platformSrc).toMatch(/in_transit:\s*\["completed"\]/);
    expect(platformSrc).toMatch(/completed:\s*\[\]/);
    expect(platformSrc).toMatch(/cancelled:\s*\[\]/);

    // Helper για να μη γράφεται το switch case σε πολλά σημεία.
    expect(platformSrc).toContain("isAllowedTransition");

    // Νέο label + tonal style + extended type. Το format.ts κρατά την συνέπεια
    // του υπόλοιπου αρχείου χρησιμοποιώντας escape sequence για Greek strings
    // (Α = \u0391), οπότε ψάχνουμε το mapping key + έναν Greek char marker.
    expect(formatSrc).toMatch(/cancelled:\s*"\\u0391/);
    expect(stylesSrc).toContain("bg-error/10 text-error");
    expect(mockSrc).toContain('"Ακυρώθηκε"');
  });

  it("Phase 0.5: PATCH /api/orders/:publicId με zod + role guard + 409", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    expect(src).toMatch(/app\.patch\("\/api\/orders\/:publicId",\s*async/);

    // Zod schema για body — limited enum, όχι free-form string
    expect(src).toContain("updateOrderStatusBody");
    expect(src).toMatch(
      /z\.enum\(\["processing",\s*"in_transit",\s*"completed",\s*"cancelled"\]\)/,
    );

    // Auth required + 401
    expect(src).toMatch(/if \(!userId\) return c\.json\(\{ error: "Unauthorized" \}, 401\)/);

    // Μόνο supplier owner — buyer cancellation θα μπει σε επόμενη φάση
    expect(src).toMatch(/isSupplierOwner.*supplierOwnerUserId === userId/s);

    // 409 για invalid transitions με current/requested στο body — ο client
    // μπορεί να ξανασυγχρονιστεί χωρίς extra GET
    expect(src).toMatch(/!isAllowedTransition\(row\.order\.status,\s*nextStatus\)/);
    expect(src).toMatch(/Invalid status transition[\s\S]*?currentStatus[\s\S]*?requestedStatus[\s\S]*?409/);

    // Single UPDATE με eq στο order.id — όχι unsafe publicId match
    expect(src).toMatch(/db\s*\.update\(orders\)[\s\S]*?\.set\(\{ status: nextStatus \}\)[\s\S]*?eq\(orders\.id, row\.order\.id\)/);

    // Επιστρέφει το πλήρες updated order με items + viewerRole=supplier για
    // instant cache refresh στον client.
    expect(src).toMatch(/viewerRole: "supplier" as const/);
    expect(src).toMatch(/from\(orderItems\)/);
  });

  it("Phase 0.5: όλες οι order responses εκθέτουν viewerRole", () => {
    const src = readFileSync(path.join(root, "platform/app.ts"), "utf8");
    // POST → πάντα buyer (μόνο buyers μπορούν να φτιάξουν παραγγελία)
    expect(src).toMatch(/viewerRole: "buyer" as const/);
    // GET → derived από u.role του authenticated viewer
    expect(src).toMatch(/viewerRole: u\.role/);
    // PATCH → πάντα supplier (role guard ήδη επιβάλλει)
    const supplierConstMatches = src.match(/viewerRole: "supplier" as const/g) ?? [];
    expect(supplierConstMatches.length).toBeGreaterThanOrEqual(1);

    // Ο OrderDetail type στον client επιβάλλει την παρουσία του
    const queries = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");
    expect(queries).toMatch(/viewerRole:\s*"buyer"\s*\|\s*"supplier"/);
  });

  it("Phase 0.5: useUpdateOrderStatusMutation σωστά cache updates", () => {
    const src = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");

    expect(src).toContain("export function useUpdateOrderStatusMutation");
    expect(src).toContain("export type OrderStatusTransition");

    // PATCH method + auth + url-encoded publicId
    expect(src).toMatch(/method:\s*"PATCH"/);
    expect(src).toMatch(/encodeURIComponent\(input\.publicId\)/);
    expect(src).toMatch(/JSON\.stringify\(\{ status: input\.status \}\)/);

    // setQueryData στο per-id cache για zero-flicker update
    expect(src).toMatch(/setQueryData\(horecaQueryKeys\.orderById\(order\.publicId\), order\)/);
    // Invalidations για list views που εξαρτώνται από status
    expect(src).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\["horeca",\s*"recentOrders"\]\s*\}\)/);
    expect(src).toMatch(/invalidateQueries\(\{[\s\S]*horecaQueryKeys\.supplierOperationalSummary/);
  });

  it("Phase 0.5: order-detail δείχνει role-aware actions + confirm flow", () => {
    const src = readFileSync(path.join(root, "app/order-detail.tsx"), "utf8");

    // Καινούργιο SupplierActions component, gated by viewerRole
    expect(src).toContain("SupplierActions");
    expect(src).toMatch(/order\.viewerRole === "supplier"/);

    // Status → actions mapping (αποδοχή/απόρριψη/παραδόθηκε)
    expect(src).toContain("getSupplierActions");
    expect(src).toMatch(/case "Νέα"/);
    expect(src).toMatch(/case "Σε επεξεργασία":/);
    expect(src).toMatch(/case "Καθ' οδόν":/);

    // Όλες οι ενέργειες περνούν από Alert.alert confirm
    expect(src).toMatch(/Αποδοχή παραγγελίας/);
    expect(src).toMatch(/Απόρριψη παραγγελίας/);
    expect(src).toMatch(/Επιβεβαίωση παράδοσης/);

    // Destructive style στο reject confirmation alert (επιτρέπουμε whitespace
    // γύρω από το ternary ?, ώστε το test να μη σπάει σε reformatting).
    expect(src).toMatch(/\.destructive\s*\?\s*"destructive"\s*:\s*"default"/);

    // Loading state — δεν επιτρέπουμε διπλό submit
    expect(src).toContain("isPending");
    expect(src).toContain("ActivityIndicator");

    // Error path δείχνει Alert με μήνυμα από το server (πχ 409 "Invalid transition")
    expect(src).toMatch(/onError:\s*\(e\)\s*=>/);
  });

  it("Phase 0.3: checkout success/error flow οδηγεί στο orders tab", () => {
    const src = readFileSync(path.join(root, "app/checkout.tsx"), "utf8");

    // Success path — όλες περνάνε, redirect στο orders tab
    expect(src).toMatch(/router\.replace\("\/\(tabs\)\/orders"\)/);
    // Partial failure — εξηγεί τι πέρασε και προτείνει επιστροφή στο cart
    expect(src).toContain("Μερική επιτυχία");
    expect(src).toMatch(/router\.replace\("\/cart"\)/);
    // Full failure — retry option
    expect(src).toMatch(/Δοκίμασε ξανά/);
    // isSubmitting guard — δεν επιτρέπει διπλό submit
    expect(src).toContain("isSubmitting");
    expect(src).toContain("ActivityIndicator");
  });

  it("Phase 1.1: backend εκθέτει isOnboarded ανάλογα με customized highlight", () => {
    const platform = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    // mapSupplierRow στέλνει το flag — συγκρίνει με NEW_SUPPLIER_DEFAULTS.highlight
    // ώστε ο client να ξέρει αν ο supplier έχει επεξεργαστεί το προφίλ.
    expect(platform).toMatch(
      /isOnboarded:\s*s\.highlight\s*!==\s*NEW_SUPPLIER_DEFAULTS\.highlight/,
    );
  });

  it("Phase 1.1: Supplier type εκθέτει optional isOnboarded", () => {
    const mocks = readFileSync(path.join(root, "lib/mocks/horeca.ts"), "utf8");
    expect(mocks).toMatch(/isOnboarded\?:\s*boolean/);
  });

  it("Phase 1.1: SupplierCard δείχνει «Νέος» pill και κρύβει placeholder tagline", () => {
    const card = readFileSync(path.join(root, "components/ui/supplier-card.tsx"), "utf8");

    // isOnboarded === false → fresh treatment.
    expect(card).toContain("supplier.isOnboarded === false");

    // «Νέος» pill στο header — με star.circle icon + primary tint.
    expect(card).toContain("star.circle.fill");
    expect(card).toMatch(/>Νέος</);

    // Placeholder tagline αντικαθίσταται με italic «Συμπληρώνει το προφίλ του.»
    expect(card).toContain("Συμπληρώνει το προφίλ του.");
    expect(card).toMatch(/!isFresh \?/);
  });

  it("Phase 1.1: SupplierProfile χειρίζεται invalid id + skip placeholder highlight", () => {
    const profile = readFileSync(path.join(root, "app/supplier-profile.tsx"), "utf8");

    // Strict parsing — όχι σιωπηλό fallback στο id=1.
    expect(profile).not.toMatch(/Number\(id \?\? "1"\) \|\| 1/);
    expect(profile).toContain("Number.isFinite(parsedId)");
    expect(profile).toContain("hasValidId");

    // Empty state για ελλιπή σύνδεσμο.
    expect(profile).toContain("Ελλιπής σύνδεσμος προμηθευτή");

    // Queries δέχονται enabled ώστε να μη χτυπάμε /api/catalog/suppliers/0.
    expect(profile).toMatch(/enabled:\s*hasValidId/);

    // Hero: «Νέος» pill + παράκαμψη placeholder highlight για fresh suppliers.
    expect(profile).toContain('supplier?.isOnboarded === false');
    expect(profile).toContain("Ο προμηθευτής συμπληρώνει το προφίλ του");
  });

  it("Phase 1.1: useSupplier queries δέχονται optional enabled flag", () => {
    const queries = readFileSync(path.join(root, "lib/horeca-queries.ts"), "utf8");

    // Και τα δύο queries υποστηρίζουν enabled (default true για backwards compat).
    expect(queries).toMatch(
      /useSupplierByIdQuery\(options:\s*\{\s*id:\s*number;\s*enabled\?:\s*boolean\s*\}\)/,
    );
    expect(queries).toMatch(
      /useProductsBySupplierQuery\(options:\s*\{\s*supplierId:\s*number;\s*enabled\?:\s*boolean\s*\}\)/,
    );
  });

  it("Phase 1.1: SuppliersScreen έχει loading state, count badge και reset CTA", () => {
    const suppliers = readFileSync(path.join(root, "app/(tabs)/suppliers.tsx"), "utf8");

    // isLoading proxy + ActivityIndicator στο πρώτο paint.
    expect(suppliers).toContain("isLoading: suppliersLoading");
    expect(suppliers).toContain("ActivityIndicator");
    expect(suppliers).toContain("Φόρτωση προμηθευτών");

    // Count badge ανάλογα με singular/plural.
    expect(suppliers).toContain("συνεργάτης");
    expect(suppliers).toContain("συνεργάτες");

    // Reset CTA όταν τα φίλτρα δεν επιστρέφουν αποτελέσματα.
    expect(suppliers).toContain("hasActiveFilters");
    expect(suppliers).toContain("handleResetFilters");
    expect(suppliers).toContain("Καθάρισε φίλτρα");
  });

  it("Phase 1.2: schema ορίζει cart_items με unique(userId,productId) + cascade", () => {
    const schema = readFileSync(path.join(root, "platform/db/schema.ts"), "utf8");

    // Table + columns
    expect(schema).toContain("cartItems = sqliteTable(");
    expect(schema).toContain('"cart_items"');
    expect(schema).toMatch(/userId:\s*integer\("user_id"\)/);
    expect(schema).toMatch(/productId:\s*integer\("product_id"\)/);
    expect(schema).toMatch(/qty:\s*integer\("qty"\)\.notNull\(\)/);
    expect(schema).toMatch(/updatedAt:\s*integer\("updated_at"/);

    // Cascade deletes — fundamental για να μην έχουμε orphan rows.
    expect(schema).toMatch(
      /userId[\s\S]{0,120}references\(\(\)\s*=>\s*users\.id,\s*\{\s*onDelete:\s*"cascade"/,
    );
    expect(schema).toMatch(
      /productId[\s\S]{0,120}references\(\(\)\s*=>\s*products\.id,\s*\{\s*onDelete:\s*"cascade"/,
    );

    // Unique index για upsert correctness.
    expect(schema).toContain("uniqueIndex");
    expect(schema).toMatch(/uniqueIndex\("cart_items_user_product_uq"\)/);

    // Relations + type export.
    expect(schema).toContain("cartItemsRelations");
    expect(schema).toContain("export type CartItemRow");
  });

  it("Phase 1.2: backend cart endpoints με buyer-only role gating", () => {
    const platform = readFileSync(path.join(root, "platform/app.ts"), "utf8");

    // 4 endpoints
    expect(platform).toContain('app.get("/api/me/cart"');
    expect(platform).toContain('app.put("/api/me/cart/items/:productId"');
    expect(platform).toContain('app.delete("/api/me/cart"');
    expect(platform).toContain('app.delete("/api/me/cart/supplier/:supplierId"');

    // Buyer-only guard — supplier παίρνει 403.
    expect(platform).toContain("requireBuyerOrError");
    expect(platform).toMatch(/u\.role\s*!==\s*"buyer"/);
    expect(platform).toMatch(/"Only buyers have a cart"[\s\S]{0,30}403/);

    // Zod validation με max bound για να μην γράφει κανείς qty=10^9.
    expect(platform).toMatch(/qty:\s*z\.number\(\)\.int\(\)\.min\(0\)\.max\(/);

    // Hydration κάνει JOIN με products + suppliers (current price/name).
    expect(platform).toContain("loadCartForUser");
    expect(platform).toMatch(/innerJoin\(products,\s*eq\(cartItems\.productId,\s*products\.id\)\)/);
    expect(platform).toMatch(/innerJoin\(suppliers,\s*eq\(products\.supplierId,\s*suppliers\.id\)\)/);

    // qty=0 → delete (idempotent UX, χωρίς ξεχωριστό endpoint).
    expect(platform).toMatch(/if\s*\(qty\s*===\s*0\)\s*\{[\s\S]{0,80}delete\(cartItems\)/);
  });

  it("Phase 1.2: cart-sync wraps store actions + bootstrap από server", () => {
    const sync = readFileSync(path.join(root, "lib/cart-sync.ts"), "utf8");

    // Wrapped actions — όλες οι store mutations έχουν synced αντίστοιχο.
    expect(sync).toContain("export async function syncedAddItem");
    expect(sync).toContain("export async function syncedSetItemQty");
    expect(sync).toContain("export async function syncedRemoveItem");
    expect(sync).toContain("export async function syncedClearBySupplier");
    expect(sync).toContain("export async function syncedClear");

    // Local-only clear για το signOut path.
    expect(sync).toContain("export function clearCartLocal");

    // Bootstrap από server με write-back guard για να μη γίνει loop.
    expect(sync).toContain("export async function bootstrapCartFromServer");
    expect(sync).toContain("isHydrating");
    expect(sync).toMatch(/if\s*\(isHydrating\)\s*return/);

    // Strategy: server wins αν έχει items, αλλιώς push local.
    expect(sync).toMatch(/data\.items\.length\s*>\s*0/);
    expect(sync).toMatch(/local\.length\s*>\s*0/);

    // 401/403 swallow — σιωπηλό fail για non-buyer/non-auth.
    expect(sync).toMatch(/e\.status\s*===\s*401/);
    expect(sync).toMatch(/e\.status\s*===\s*403/);
  });

  it("Phase 1.2: navigateAfterHorecaAuth κάνει cart bootstrap για buyer", () => {
    const role = readFileSync(path.join(root, "lib/horeca-stored-role.ts"), "utf8");

    expect(role).toContain('from "@/lib/cart-sync"');
    expect(role).toContain("bootstrapCartFromServer");
    // Fire-and-forget — δεν μπλοκάρει το routing.
    expect(role).toMatch(/void\s+bootstrapCartFromServer\(\)/);
    // Καλείται μόνο στο buyer branch (μετά το supplier early-return).
    expect(role).toMatch(
      /role\s*===\s*"supplier"[\s\S]*?supplier-tabs[\s\S]*?return;[\s\S]*?bootstrapCartFromServer/,
    );
  });

  it("Phase 1.2: signOut() καθαρίζει local cart (cross-user leak fix)", () => {
    const api = readFileSync(path.join(root, "lib/_core/api.ts"), "utf8");

    expect(api).toContain('from "@/lib/cart-sync"');
    expect(api).toContain("clearCartLocal");
    // Το call πρέπει να γίνεται μέσα στο signOut, όχι σε ξεχωριστό export.
    expect(api).toMatch(
      /export async function signOut[\s\S]{0,400}clearCartLocal\(\);[\s\S]{0,40}\}/,
    );
  });

  it("Phase 1.2: όλοι οι 5 consumers χρησιμοποιούν synced* αντί store mutations", () => {
    const catalog = readFileSync(path.join(root, "app/catalog.tsx"), "utf8");
    const productDetail = readFileSync(path.join(root, "app/product-detail.tsx"), "utf8");
    const cart = readFileSync(path.join(root, "app/cart.tsx"), "utf8");
    const checkout = readFileSync(path.join(root, "app/checkout.tsx"), "utf8");
    const orderDetail = readFileSync(path.join(root, "app/order-detail.tsx"), "utf8");

    // catalog + product-detail: addItem → syncedAddItem
    expect(catalog).toContain("syncedAddItem");
    expect(catalog).not.toMatch(/useCartStore\(\(s\)\s*=>\s*s\.addItem\)/);
    expect(productDetail).toContain("syncedAddItem");
    expect(productDetail).not.toMatch(/useCartStore\(\(s\)\s*=>\s*s\.addItem\)/);

    // cart: 3 mutations → 3 synced wrappers
    expect(cart).toContain("syncedSetItemQty");
    expect(cart).toContain("syncedRemoveItem");
    expect(cart).toContain("syncedClearBySupplier");
    expect(cart).not.toMatch(/useCartStore\(\(s\)\s*=>\s*s\.setItemQty\)/);
    expect(cart).not.toMatch(/useCartStore\(\(s\)\s*=>\s*s\.removeItem\)/);

    // checkout: clearBySupplier → syncedClearBySupplier
    expect(checkout).toContain("syncedClearBySupplier");
    expect(checkout).not.toMatch(/useCartStore\(\(s\)\s*=>\s*s\.clearBySupplier\)/);

    // order-detail (reorder CTA): addItem → syncedAddItem
    expect(orderDetail).toContain("syncedAddItem");
    expect(orderDetail).not.toMatch(/useCartStore\(\(s\)\s*=>\s*s\.addItem\)/);
  });

  it("Phase 1.2: parseMinimumOrderEur καλύπτει EU/ASCII variations", async () => {
    // Pure function — έχει βγει σε `lib/cart-pricing.ts` ώστε να γίνεται
    // import σε Node test env χωρίς να σύρει RN/expo runtime.
    const { parseMinimumOrderEur } = await import("../lib/cart-pricing");

    expect(parseMinimumOrderEur("Ελάχιστη παραγγελία 80€")).toBe(80);
    expect(parseMinimumOrderEur("Από €120")).toBe(120);
    expect(parseMinimumOrderEur("60 ευρώ")).toBe(60);
    expect(parseMinimumOrderEur("80,50€")).toBe(80.5);
    expect(parseMinimumOrderEur("80.50 €")).toBe(80.5);
    expect(parseMinimumOrderEur("EUR 50")).toBe(50);
    expect(parseMinimumOrderEur("Χωρίς ελάχιστο")).toBe(null);
    expect(parseMinimumOrderEur("Δεν έχει οριστεί")).toBe(null);
    expect(parseMinimumOrderEur("")).toBe(null);
  });

  it("Phase 1.2: checkout polish — summary tiles + MOQ guard non-blocking", () => {
    const checkout = readFileSync(path.join(root, "app/checkout.tsx"), "utf8");

    // Summary strip: 3 tiles με supplier count, items και total.
    expect(checkout).toContain("SummaryTile");
    expect(checkout).toMatch(/label="Είδη"/);
    expect(checkout).toMatch(/label="Σύνολο"/);
    expect(checkout).toMatch(/groups\.length === 1\s*\?\s*"Προμηθευτής"\s*:\s*"Προμηθευτές"/);

    // MOQ guard — warning, όχι hard block στο submit.
    expect(checkout).toContain("parseMinimumOrderEur");
    expect(checkout).toContain("isBelowMoq");
    expect(checkout).toContain("Κάτω από το ελάχιστο");
    // Το submit button δεν disable-άρεται από MOQ — μόνο από isSubmitting.
    // (Defensive check: δεν θέλουμε hidden coupling που μπλοκάρει legit orders.)
    expect(checkout).toMatch(/disabled=\{isSubmitting\}/);

    // Suppliers fetched ώστε να γίνει το MOQ lookup.
    expect(checkout).toContain("useSuppliersListQuery");
    expect(checkout).toContain("suppliersById");
  });
});
