import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Router } from "expo-router";

export type HorecaAccountRole = "buyer" | "supplier";

const ROLE_KEY = "horeca-source-demo-role";
const COMPANY_KEY = "horeca-source-demo-company";

export async function getStoredHorecaRole(): Promise<HorecaAccountRole> {
  const r = await AsyncStorage.getItem(ROLE_KEY);
  return r === "supplier" ? "supplier" : "buyer";
}

export async function setStoredHorecaProfile(role: HorecaAccountRole, companyName: string) {
  await AsyncStorage.multiSet([
    [ROLE_KEY, role],
    [COMPANY_KEY, companyName],
  ]);
}

/** After login or register, go to supplier dashboard or buyer tabs based on stored (or override) role. */
export async function navigateAfterHorecaAuth(
  router: Pick<Router, "replace">,
  roleOverride?: HorecaAccountRole,
) {
  const role = roleOverride ?? (await getStoredHorecaRole());
  if (role === "supplier") {
    router.replace("/supplier-dashboard");
    return;
  }
  router.replace("/(tabs)");
}
