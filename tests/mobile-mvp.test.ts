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

    expect(ordersScreen).toContain("{recentOrders.map((order) => (");
    expect(ordersScreen).toContain(
      '<View key={order.id} className="rounded-[24px] border border-border bg-surface p-4">',
    );
    expect(ordersScreen).toContain('<TouchableOpacity className="rounded-full bg-primary px-4 py-2">');
    expect(ordersScreen).not.toContain(
      '<TouchableOpacity key={order.id} className="rounded-[24px] border border-border bg-surface p-4">',
    );
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

  it("χρησιμοποιεί standard SafeAreaProvider wiring στο root layout", () => {
    const rootLayout = readFileSync(path.join(root, "app/_layout.tsx"), "utf8");

    expect(rootLayout).toContain('import "../global.css";');
    expect(rootLayout).toContain("<SafeAreaProvider initialMetrics={providerInitialMetrics}>");
    expect(rootLayout).not.toContain("subscribeSafeAreaInsets");
    expect(rootLayout).not.toContain("SafeAreaFrameContext.Provider");
    expect(rootLayout).not.toContain("SafeAreaInsetsContext.Provider");
  });
});
