import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@horeca:activeBuyerLoc";

export function persistedActiveBuyerLocKey(userId: number): string {
  return `${PREFIX}:${userId}`;
}

/** Επιλεγμένο κατάστημα (location id ως string) για τον buyer — ανά user id συσκευής. */
export async function getActiveBuyerLocationId(userId: number): Promise<string | null> {
  return AsyncStorage.getItem(persistedActiveBuyerLocKey(userId));
}

export async function setActiveBuyerLocationId(
  userId: number,
  locationId: string | null,
): Promise<void> {
  const key = persistedActiveBuyerLocKey(userId);
  if (!locationId) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await AsyncStorage.setItem(key, locationId);
}

/** Εκκαθαρίζει όλα τα αποθηκευμένα active location IDs (κλήση από signOut). */
export async function clearActiveBuyerLocationsFromDevice(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(`${PREFIX}:`)));
}
