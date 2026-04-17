import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SupplierMap } from "@/components/ui/supplier-map";
import { useColors } from "@/hooks/use-colors";
import { useProductsBySupplierQuery, useSupplierByIdQuery } from "@/lib/horeca-queries";

/**
 * 2-letter initials from the supplier name. Duplicates the helper in
 * `supplier-card.tsx` on purpose — we don't want the profile screen to pull
 * in UI-list components just for a string utility, and the logic is 4 lines.
 */
function getInitials(name: string): string {
  const tokens = name.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return "?";
  const first = tokens[0].charAt(0);
  const second = tokens[1]?.charAt(0) ?? tokens[0].charAt(1) ?? "";
  return `${first}${second}`.toUpperCase();
}

export default function SupplierProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const supplierId = Number(id ?? "1") || 1;
  const { data: supplier, isLoading: supplierLoading } = useSupplierByIdQuery({ id: supplierId });
  const { data: supplierProducts = [], isLoading: productsLoading } = useProductsBySupplierQuery({
    supplierId,
  });

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-5 pt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Επιστροφή"
            className="flex-row items-center gap-1 self-start"
          >
            <IconSymbol name="chevron.right" size={16} color={colors.primary} style={{ transform: [{ rotate: "180deg" }] }} />
            <Text className="text-sm font-semibold text-primary">Πίσω</Text>
          </TouchableOpacity>

          {supplierLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : supplier ? (
            <>
              {/* Hero card: avatar + name + verified + rating + tagline + 3-stat grid */}
              <View className="rounded-[28px] border border-border bg-surface p-5">
                <View className="flex-row items-center gap-4">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-xl font-bold text-primary">{getInitials(supplier.name)}</Text>
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-[22px] font-bold leading-7 text-foreground" numberOfLines={2}>
                      {supplier.name}
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-2">
                      {supplier.verified ? (
                        <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-1">
                          <IconSymbol name="checkmark.seal.fill" size={12} color={colors.success} />
                          <Text className="text-[11px] font-semibold text-success">Εξακριβωμένος</Text>
                        </View>
                      ) : null}
                      <View className="flex-row items-center gap-1">
                        <IconSymbol name="star.fill" size={13} color={colors.warning} />
                        <Text className="text-sm font-semibold text-foreground">
                          {supplier.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text className="mt-4 text-base leading-6 text-foreground">{supplier.highlight}</Text>

                <View className="mt-4 flex-row items-center gap-1">
                  <IconSymbol name="mappin.and.ellipse" size={14} color={colors.muted} />
                  <Text className="text-sm font-medium text-muted">{supplier.location}</Text>
                </View>

                {/* 3-stat grid: category / delivery / MOQ — equal widths, clear labels */}
                <View className="mt-5 flex-row gap-2">
                  <StatTile label="Κατηγορία" value={supplier.category} />
                  <StatTile label="Παράδοση" value={supplier.deliveryTime} />
                  <StatTile label="MOQ" value={supplier.minimumOrder} />
                </View>
              </View>

              {/*
                Map preview — εμφανίζεται μόνο όταν ο προμηθευτής έχει
                συντεταγμένες. Αν λείπουν, κρύβουμε το section ώστε να μη
                δείχνει άδειο χάρτη στο κέντρο της οθόνης.
              */}
              {supplier.latitude !== undefined && supplier.longitude !== undefined ? (
                <View className="gap-3">
                  <Text className="text-lg font-bold text-foreground">Τοποθεσία</Text>
                  <SupplierMap
                    supplierName={supplier.name}
                    location={supplier.location}
                    latitude={supplier.latitude}
                    longitude={supplier.longitude}
                  />
                </View>
              ) : null}

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-foreground">Κατάλογος προμηθευτή</Text>
                  <Text className="text-sm font-medium text-muted">
                    {supplierProducts.length > 0 ? `${supplierProducts.length} προϊόντα` : ""}
                  </Text>
                </View>

                {productsLoading ? (
                  <View className="items-center py-8">
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : supplierProducts.length === 0 ? (
                  <View className="items-center rounded-[24px] border border-dashed border-border bg-surface px-4 py-8">
                    <Text className="text-center text-sm text-muted">
                      Ο προμηθευτής δεν έχει δημοσιεύσει ακόμη προϊόντα.
                    </Text>
                  </View>
                ) : (
                  supplierProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      onPress={() =>
                        router.push({ pathname: "/product-detail", params: { id: product.id } })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Άνοιγμα προϊόντος: ${product.name}`}
                      className="rounded-[24px] border border-border bg-surface p-4"
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1 gap-1">
                          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                            {product.name}
                          </Text>
                          <Text className="text-sm text-muted">{product.unit}</Text>
                        </View>
                        <Text className="text-base font-bold text-foreground">{product.price}</Text>
                      </View>
                      <View className="mt-3 flex-row items-center justify-between">
                        <View className="self-start rounded-full bg-background px-3 py-1">
                          <Text className="text-xs font-semibold text-muted">{product.availability}</Text>
                        </View>
                        <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          ) : (
            <View className="items-center rounded-[24px] border border-dashed border-border bg-surface px-4 py-8">
              <Text className="text-center text-base text-muted">Ο προμηθευτής δεν βρέθηκε.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-[20px] bg-background p-3">
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-foreground" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
