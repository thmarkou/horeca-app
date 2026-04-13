import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { featuredProducts, recentOrders, suppliers } from "../lib/mocks/horeca";

describe("Horeca Source mobile MVP", () => {
  it("έχει ενημερωμένο branding στο app config", () => {
    const config = readFileSync("/home/ubuntu/horeca_mobile_app/app.config.ts", "utf8");

    expect(config).toContain('appName: "Horeca Source"');
    expect(config).toContain("horeca-source-icon-YUE3GiZc9HHTh2v6QQyKj3.png");
  });

  it("διαθέτει τα βασικά route files του MVP", () => {
    const requiredRoutes = [
      "/home/ubuntu/horeca_mobile_app/app/index.tsx",
      "/home/ubuntu/horeca_mobile_app/app/welcome.tsx",
      "/home/ubuntu/horeca_mobile_app/app/sign-in.tsx",
      "/home/ubuntu/horeca_mobile_app/app/sign-up.tsx",
      "/home/ubuntu/horeca_mobile_app/app/catalog.tsx",
      "/home/ubuntu/horeca_mobile_app/app/product-detail.tsx",
      "/home/ubuntu/horeca_mobile_app/app/cart.tsx",
      "/home/ubuntu/horeca_mobile_app/app/checkout.tsx",
      "/home/ubuntu/horeca_mobile_app/app/supplier-profile.tsx",
      "/home/ubuntu/horeca_mobile_app/app/order-detail.tsx",
      "/home/ubuntu/horeca_mobile_app/app/supplier-dashboard.tsx",
      "/home/ubuntu/horeca_mobile_app/app/supplier-orders.tsx",
      "/home/ubuntu/horeca_mobile_app/app/(tabs)/index.tsx",
      "/home/ubuntu/horeca_mobile_app/app/(tabs)/suppliers.tsx",
      "/home/ubuntu/horeca_mobile_app/app/(tabs)/orders.tsx",
      "/home/ubuntu/horeca_mobile_app/app/(tabs)/favorites.tsx",
      "/home/ubuntu/horeca_mobile_app/app/(tabs)/account.tsx",
    ];

    requiredRoutes.forEach((filePath) => {
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
    });
  });

  it("φορτώνει ουσιαστικά mock δεδομένα για suppliers, products και orders", () => {
    expect(suppliers.length).toBeGreaterThanOrEqual(3);
    expect(featuredProducts.length).toBeGreaterThanOrEqual(3);
    expect(recentOrders.length).toBeGreaterThanOrEqual(3);
    expect(suppliers.every((supplier) => supplier.name.length > 0)).toBe(true);
  });

  it("έχει τα απαιτούμενα icon assets για iOS και Android branding", () => {
    const assetPaths = [
      "/home/ubuntu/horeca_mobile_app/assets/images/icon.png",
      "/home/ubuntu/horeca_mobile_app/assets/images/splash-icon.png",
      "/home/ubuntu/horeca_mobile_app/assets/images/favicon.png",
      "/home/ubuntu/horeca_mobile_app/assets/images/android-icon-foreground.png",
    ];

    assetPaths.forEach((filePath) => {
      expect(existsSync(filePath), `${filePath} should exist`).toBe(true);
    });
  });

  it("υποστηρίζει εναλλαγή ρόλου και λειτουργικό submit στη φόρμα εγγραφής", () => {
    const signUpScreen = readFileSync("/home/ubuntu/horeca_mobile_app/app/sign-up.tsx", "utf8");

    expect(signUpScreen).toContain("useState");
    expect(signUpScreen).toContain("const [role, setRole] = useState<AccountRole>(\"buyer\")");
    expect(signUpScreen).toContain("onPress={() => setRole(\"buyer\")}");
    expect(signUpScreen).toContain("onPress={() => setRole(\"supplier\")}");
    expect(signUpScreen).toContain("const handleCreateAccount = async () => {");
    expect(signUpScreen).toContain("onPress={handleCreateAccount}");
    expect(signUpScreen).toContain('router.replace("/supplier-dashboard")');
    expect(signUpScreen).toContain('router.replace("/(tabs)")');
    expect(signUpScreen).toContain("Η δημιουργία λογαριασμού δεν ολοκληρώθηκε. Δοκιμάστε ξανά.");
  });

  it("αποφεύγει nested Text onPress links στις auth οθόνες για ασφαλέστερο web rendering", () => {
    const signUpScreen = readFileSync("/home/ubuntu/horeca_mobile_app/app/sign-up.tsx", "utf8");
    const signInScreen = readFileSync("/home/ubuntu/horeca_mobile_app/app/sign-in.tsx", "utf8");

    expect(signUpScreen).not.toContain('<Text className="font-semibold text-primary" onPress={() => router.push("/sign-in")}>');
    expect(signInScreen).not.toContain('<Text className="font-semibold text-primary" onPress={() => router.push("/sign-up")}>');
    expect(signUpScreen).toContain('<TouchableOpacity onPress={() => router.push("/sign-in")}>');
    expect(signInScreen).toContain('<TouchableOpacity onPress={() => router.push("/sign-up")}>');
  });

  it("αποφεύγει nested touchable κάρτες στη λίστα παραγγελιών του web preview", () => {
    const ordersScreen = readFileSync("/home/ubuntu/horeca_mobile_app/app/(tabs)/orders.tsx", "utf8");

    expect(ordersScreen).toContain('{recentOrders.map((order) => (');
    expect(ordersScreen).toContain('<View key={order.id} className="rounded-[24px] border border-border bg-surface p-4">');
    expect(ordersScreen).toContain('<TouchableOpacity className="rounded-full bg-primary px-4 py-2">');
    expect(ordersScreen).not.toContain('<TouchableOpacity key={order.id} className="rounded-[24px] border border-border bg-surface p-4">');
  });

  it("χρησιμοποιεί standard SafeAreaProvider wiring στο root layout για σταθερότερο web unmount behavior", () => {
    const rootLayout = readFileSync("/home/ubuntu/horeca_mobile_app/app/_layout.tsx", "utf8");

    expect(rootLayout).toContain('import "../global.css";');
    expect(rootLayout).toContain('<SafeAreaProvider initialMetrics={providerInitialMetrics}>');
    expect(rootLayout).not.toContain("subscribeSafeAreaInsets");
    expect(rootLayout).not.toContain("SafeAreaFrameContext.Provider");
    expect(rootLayout).not.toContain("SafeAreaInsetsContext.Provider");
  });
});
