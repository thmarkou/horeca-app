import * as Linking from "expo-linking";
import type { ComponentType } from "react";
import { Alert, Platform, Text, TouchableOpacity, UIManager, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export interface SupplierMapProps {
  supplierName: string;
  location: string;
  latitude: number;
  longitude: number;
}

/**
 * `react-native-maps` registers ένα native view manager με όνομα `AIRMap`.
 * Αν το JS bundle τρέχει σε binary που δεν έχει το pod εγκατεστημένο (π.χ.
 * stale Xcode build ή Expo Go), το native side σκάει όταν γίνει render το
 * `<MapView>` — με invariant violation που ΔΕΝ πιάνεται από JS try/catch
 * ή React ErrorBoundary γιατί είναι native-level failure.
 *
 * Οπότε ελέγχουμε το `UIManager.hasViewManagerConfig("AIRMap")` ΠΡΙΝ καν
 * κάνουμε require το module — αν λείπει, δεν αγγίζουμε καθόλου το package
 * και δείχνουμε fallback UI (pin icon + deep link CTA).
 */
type MapModule = {
  default: ComponentType<Record<string, unknown>>;
  Marker: ComponentType<Record<string, unknown>>;
  PROVIDER_DEFAULT: unknown;
};

/**
 * Το `hasViewManagerConfig` είναι διαθέσιμο σε RN >= 0.60· κάνουμε optional
 * chaining για safety. Επιστρέφει `null | undefined` όταν το manager λείπει.
 */
function hasNativeMapManager(): boolean {
  const manager = UIManager as UIManager & {
    hasViewManagerConfig?: (name: string) => boolean;
    getViewManagerConfig?: (name: string) => unknown;
  };
  if (typeof manager.hasViewManagerConfig === "function") {
    return manager.hasViewManagerConfig("AIRMap");
  }
  if (typeof manager.getViewManagerConfig === "function") {
    return Boolean(manager.getViewManagerConfig("AIRMap"));
  }
  return false;
}

function loadMapModule(): MapModule | null {
  if (!hasNativeMapManager()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-maps") as MapModule;
  } catch {
    return null;
  }
}

const mapModule = loadMapModule();

/**
 * Builds a native maps deep link with a labeled pin.
 *
 * On iOS we use the documented `maps://?ll=&q=` scheme so the Apple Maps app
 * opens pre-centered on the coordinates with the supplier name as label.
 * On Android we fall back to the geo: intent that Google Maps handles by
 * default — works without any API key or app-specific URL.
 */
function buildMapsUrl(lat: number, lng: number, label: string): string {
  const encoded = encodeURIComponent(label);
  if (Platform.OS === "ios") {
    return `maps://?ll=${lat},${lng}&q=${encoded}`;
  }
  return `geo:${lat},${lng}?q=${lat},${lng}(${encoded})`;
}

/**
 * Fixed-height, non-interactive map preview με pin στο supplier location.
 * Ο χρήστης πατάει → ανοίγει native Maps app (Apple Maps σε iOS, Google σε
 * Android) με προεπιλεγμένη τοποθεσία. Κρατάμε το preview non-interactive
 * (scroll/zoom disabled) ώστε να μην συγκρούεται με το parent ScrollView.
 */
export function SupplierMap({
  supplierName,
  location,
  latitude,
  longitude,
}: SupplierMapProps) {
  const colors = useColors();

  async function handleOpenInMaps() {
    const url = buildMapsUrl(latitude, longitude, supplierName);
    try {
      await Linking.openURL(url);
    } catch {
      // Π.χ. simulator χωρίς Maps app installed ή web build.
      Alert.alert(
        "Δεν ήταν δυνατό το άνοιγμα",
        "Η εφαρμογή Χαρτών δεν είναι διαθέσιμη σε αυτή τη συσκευή.",
      );
    }
  }

  const footer = (
    <View className="flex-row items-center justify-between border-t border-border px-4 py-3">
      <View className="flex-row items-center gap-2">
        <IconSymbol name="mappin.and.ellipse" size={14} color={colors.muted} />
        <Text className="text-sm font-medium text-foreground">{location}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-sm font-semibold text-primary">Άνοιγμα στους Χάρτες</Text>
        <IconSymbol name="arrow.right" size={14} color={colors.primary} />
      </View>
    </View>
  );

  // Fallback όταν το native module λείπει: δείχνουμε απλή τοποθεσία + CTA.
  // Η εφαρμογή δεν σκάει και ο χρήστης μπορεί να ανοίξει native Maps.
  if (!mapModule) {
    return (
      <View className="overflow-hidden rounded-[24px] border border-border bg-surface">
        <TouchableOpacity
          onPress={handleOpenInMaps}
          accessibilityRole="button"
          accessibilityLabel={`Άνοιγμα τοποθεσίας ${supplierName} στους Χάρτες`}
          activeOpacity={0.9}
        >
          <View
            className="items-center justify-center bg-muted/20"
            style={{ width: "100%", height: 140 }}
          >
            <IconSymbol name="mappin.and.ellipse" size={32} color={colors.primary} />
            <Text className="mt-2 text-sm font-medium text-muted">
              Προβολή στους Χάρτες
            </Text>
          </View>
          {footer}
        </TouchableOpacity>
      </View>
    );
  }

  const MapView = mapModule.default;
  const { Marker, PROVIDER_DEFAULT } = mapModule;

  return (
    <View className="overflow-hidden rounded-[24px] border border-border bg-surface">
      <TouchableOpacity
        onPress={handleOpenInMaps}
        accessibilityRole="button"
        accessibilityLabel={`Άνοιγμα τοποθεσίας ${supplierName} στους Χάρτες`}
        activeOpacity={0.9}
      >
        <MapView
          provider={PROVIDER_DEFAULT}
          style={{ width: "100%", height: 180 }}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          pointerEvents="none"
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title={supplierName}
            description={location}
          />
        </MapView>
        {footer}
      </TouchableOpacity>
    </View>
  );
}
