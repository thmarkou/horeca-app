import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
    expect(detailScreen).toContain("orders.find((o) => o.id === id)");
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

  it("supplier dashboard: ελληνικά, greeting, metric tiles, preview παραδόσεων", () => {
    const dashboard = readFileSync(path.join(root, "app/(supplier-tabs)/index.tsx"), "utf8");

    expect(dashboard).not.toContain("Supplier dashboard");
    expect(dashboard).toContain("getGreetingForDate");
    expect(dashboard).toContain("getFirstName");
    expect(dashboard).toContain("Επισκόπηση");
    expect(dashboard).toContain('label="Νέες παραγγελίες"');
    expect(dashboard).toContain("Επόμενες παραδόσεις");
    expect(dashboard).toContain('router.push("/(supplier-tabs)/orders")');
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

    // Auto-enroll στο register ώστε κάθε user να έχει row.
    expect(platform).toMatch(/db\.insert\(subscriptions\)\.values\(\{ userId: row\.id, plan: "free"/);

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
});
