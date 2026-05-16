import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { CartSummaryBar } from "@/components/ui/cart-summary-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { StarRating } from "@/components/ui/star-rating";
import { SupplierMap } from "@/components/ui/supplier-map";
import { useColors } from "@/hooks/use-colors";
import { useProductsBySupplierQuery, useSupplierByIdQuery } from "@/lib/horeca-queries";
import type { Supplier } from "@/lib/mocks/horeca";

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
  // Strict parsing — αν λείπει ή είναι μη-έγκυρο το id, εμφανίζουμε proper
  // not-found state αντί να ανοίγουμε σιωπηλά τον supplier με id=1 (μπερδεύει
  // user από deep-link/typo).
  const parsedId = Number(id);
  const hasValidId = Number.isFinite(parsedId) && parsedId > 0;
  const supplierId = hasValidId ? parsedId : 0;
  const { data: supplier, isLoading: supplierLoading } = useSupplierByIdQuery({
    id: supplierId,
    enabled: hasValidId,
  });
  const { data: supplierProducts = [], isLoading: productsLoading } = useProductsBySupplierQuery({
    supplierId,
    enabled: hasValidId,
  });
  // Για να δείξουμε «Νέος» badge στο hero όταν ο supplier δεν έχει συμπληρώσει
  // ακόμη το profile (Phase 0.6 defaults).
  const isFresh = supplier?.isOnboarded === false;

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

          {!hasValidId ? (
            <View className="items-center rounded-[24px] border border-dashed border-border bg-surface px-4 py-8">
              <Text className="text-center text-base text-muted">
                Ελλιπής σύνδεσμος προμηθευτή. Επίστρεψε στη λίστα και επίλεξε ξανά.
              </Text>
            </View>
          ) : supplierLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : supplier ? (
            <>
              {/* Hero card: avatar + name + verified/Νέος + rating + tagline + 3-stat grid */}
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
                      {/* «Νέος» έχει προτεραιότητα — fresh suppliers δεν έχουν
                          ακόμη verified ή ratings, οπότε εμφάνιζε ένα signal. */}
                      {isFresh ? (
                        <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                          <IconSymbol name="star.circle.fill" size={12} color={colors.primary} />
                          <Text className="text-[11px] font-semibold text-primary">Νέος</Text>
                        </View>
                      ) : supplier.verified ? (
                        <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-1">
                          <IconSymbol name="checkmark.seal.fill" size={12} color={colors.success} />
                          <Text className="text-[11px] font-semibold text-success">Εξακριβωμένος</Text>
                        </View>
                      ) : null}
                      {/* Star rating κρύβεται για fresh suppliers — δεν έχουν
                          reviews, και το «Νέος» pill ήδη το λέει. */}
                      {!isFresh ? <StarRating rating={supplier.rating} size="md" /> : null}
                    </View>
                  </View>
                </View>

                {/* Placeholder tagline παραλείπεται για fresh suppliers ώστε
                    όλοι οι νέοι να μη δείχνουν το ίδιο εργοστασιακό κείμενο. */}
                {!isFresh ? (
                  <Text className="mt-4 text-base leading-6 text-foreground">{supplier.highlight}</Text>
                ) : (
                  <Text className="mt-4 text-base italic leading-6 text-muted">
                    Ο προμηθευτής συμπληρώνει το προφίλ του στην πλατφόρμα.
                  </Text>
                )}

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

              <DeliveryPolicySection supplier={supplier} />
              <ContactSection />

              {/* Primary footer CTA — γρήγορη είσοδος στον κατάλογο του supplier.
                  Δίνει σαφή «next step» χωρίς να χρειάζεται ο user να σκρολάρει
                  πάνω-κάτω βρίσκοντας individual product cards. */}
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: "/catalog", params: { supplierId: String(supplierId) } })
                }
                accessibilityRole="button"
                accessibilityLabel="Ξεκίνα παραγγελία από αυτόν τον προμηθευτή"
                disabled={supplierProducts.length === 0}
                className={`rounded-full bg-primary px-4 py-4 ${
                  supplierProducts.length === 0 ? "opacity-50" : ""
                }`}
              >
                <Text className="text-center text-base font-semibold text-background">
                  Ξεκίνα παραγγελία
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="items-center rounded-[24px] border border-dashed border-border bg-surface px-4 py-8">
              <Text className="text-center text-base text-muted">Ο προμηθευτής δεν βρέθηκε.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <CartSummaryBar />
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

/**
 * Στατική section που αντλεί τα fields τού supplier (delivery time, MOQ,
 * verified status) σε ένα ομαδοποιημένο card. Δεν φτιάχνουμε δικό μας
 * «πολιτική κειμένου» — η αλήθεια είναι ότι κάθε supplier έχει το δικό του
 * service contract, οπότε εδώ απλά παρουσιάζουμε ό,τι ξέρουμε structured.
 */
function DeliveryPolicySection({ supplier }: { supplier: Supplier }) {
  const colors = useColors();
  return (
    <View className="gap-3">
      <Text className="text-lg font-bold text-foreground">Πολιτική παράδοσης</Text>
      <View className="gap-2 rounded-[24px] border border-border bg-surface p-4">
        <PolicyRow
          icon={<IconSymbol name="clock.fill" size={14} color={colors.muted} />}
          label="Χρόνος παράδοσης"
          value={supplier.deliveryTime}
        />
        <PolicyRow
          icon={<IconSymbol name="shippingbox.fill" size={14} color={colors.muted} />}
          label="Ελάχιστη παραγγελία"
          value={supplier.minimumOrder}
        />
        <PolicyRow
          icon={<IconSymbol name="mappin.and.ellipse" size={14} color={colors.muted} />}
          label="Έδρα / Κάλυψη"
          value={supplier.location}
        />
        {supplier.verified ? (
          <PolicyRow
            icon={<IconSymbol name="checkmark.seal.fill" size={14} color={colors.success} />}
            label="Επαλήθευση"
            value="Στοιχεία επιχείρησης ελεγμένα από το Horeca Source."
            highlight
          />
        ) : null}
      </View>
    </View>
  );
}

function PolicyRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** Επισημαίνει positive trust signals (verified) με success border. */
  highlight?: boolean;
}) {
  return (
    <View
      className={`flex-row items-start gap-3 rounded-2xl px-3 py-2 ${
        highlight ? "bg-success/10" : "bg-background"
      }`}
    >
      <View className="pt-1">{icon}</View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</Text>
        <Text className="text-sm font-medium leading-5 text-foreground">{value}</Text>
      </View>
    </View>
  );
}

/**
 * Placeholder section μέχρι να μπει το proper messaging/chat (Phase 3+).
 * Ο reasoning είναι ότι οι buyers θέλουν ξεκάθαρα να ξέρουν «πώς θα τους
 * φτάσω;» πριν προχωρήσουν σε παραγγελία. Δείχνουμε τι δουλεύει σήμερα
 * (παραγγελία in-app μετά από αποδοχή supplier) και τι έρχεται.
 */
function ContactSection() {
  const colors = useColors();
  return (
    <View className="gap-3">
      <Text className="text-lg font-bold text-foreground">Επικοινωνία</Text>
      <View className="gap-3 rounded-[24px] border border-dashed border-border bg-surface/60 p-4">
        <View className="flex-row items-start gap-3">
          <IconSymbol name="paperplane.fill" size={16} color={colors.primary} />
          <View className="flex-1 gap-1">
            <Text className="text-sm font-semibold text-foreground">Μέσω παραγγελίας</Text>
            <Text className="text-xs leading-5 text-muted">
              Στείλε παραγγελία και άφησε σημείωση στο checkout. Ο προμηθευτής βλέπει το
              αίτημα και απαντά εντός του χρόνου παράδοσης που έχει δηλώσει.
            </Text>
          </View>
        </View>
        <View className="flex-row items-start gap-3">
          <IconSymbol name="bell.fill" size={16} color={colors.muted} />
          <View className="flex-1 gap-1">
            <Text className="text-sm font-semibold text-foreground">Άμεσα μηνύματα</Text>
            <Text className="text-xs leading-5 text-muted">
              Έρχεται σύντομα: 1-on-1 chat με τον προμηθευτή για ερωτήσεις πριν την παραγγελία.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
