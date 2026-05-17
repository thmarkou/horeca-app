import { useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { showSubscriptionPaywallAlert } from "@/components/ui/gated-action";
import { StarRating } from "@/components/ui/star-rating";
import { useColors } from "@/hooks/use-colors";
import { ApiError } from "@/lib/api/http";
import { useAddFavoriteMutation, useFavoritesQuery, useRemoveFavoriteMutation } from "@/lib/horeca-queries";
import type { Supplier } from "@/lib/mocks/horeca";
import { useFeatures } from "@/lib/subscription";

export interface SupplierCardProps {
  supplier: Supplier;
  onPress: () => void;
  /**
   * Ξεχωριστή ζώνη επαφής (π.χ. καρδιά) που δεν πυροδοτεί το `onPress` της κάρτας.
   * Περνάται ως απόλυτη θέση μέσα στο wrapper `View`.
   */
  favoriteAccessory?: ReactNode;
}

/**
 * Returns up to 2 uppercase initials from the supplier name, skipping
 * single-character connector words (e.g. "&") so "A & B Coffee" → "AB"
 * instead of "A&".
 */
function getInitials(name: string): string {
  const tokens = name
    .split(/\s+/)
    .filter((token) => token.length > 1 || /\p{L}/u.test(token.charAt(0)));
  if (tokens.length === 0) return name.slice(0, 2).toUpperCase();
  const first = tokens[0].charAt(0);
  const second = tokens[1]?.charAt(0) ?? tokens[0].charAt(1) ?? "";
  return `${first}${second}`.toUpperCase();
}

/**
 * Toggle για αποθηκευμένο προμηθευτή — buyer lists + προφίλ. Προ-έλεγχος cap
 * για άμεσο paywall UX· το POST επιστρέφει 402 ως authoritative guard.
 */
export function FavoriteSupplierHeart({ supplier }: { supplier: Supplier }) {
  const colors = useColors();
  const router = useRouter();
  const features = useFeatures();
  const { data: favorites = [], isFetching } = useFavoritesQuery();
  const addFavorite = useAddFavoriteMutation();
  const removeFavorite = useRemoveFavoriteMutation();

  const isFavorite = favorites.some((s) => s.id === supplier.id);
  const busy = addFavorite.isPending || removeFavorite.isPending || isFetching;

  const hitFreeCapLocally =
    !features.unlimitedSavedSuppliers &&
    favorites.length >= features.maxSavedSuppliers &&
    !isFavorite;

  const handlePress = () => {
    if (busy) return;
    if (isFavorite) {
      removeFavorite.mutate(supplier.id);
      return;
    }
    if (hitFreeCapLocally) {
      showSubscriptionPaywallAlert(
        () => router.push("/subscription"),
        undefined,
        "Ο δωρεάν λογαριασμός φιλοξενεί έως 3 αποθηκευμένους προμηθευτές. Αναβάθμισε σε Pro για απεριόριστους συνεργάτες.",
      );
      return;
    }

    addFavorite.mutate(supplier, {
      onError: (e) => {
        if (e instanceof ApiError && e.status === 402) {
          showSubscriptionPaywallAlert(
            () => router.push("/subscription"),
            undefined,
            "Έχεις πιάσει το όριο αποθηκευμένων προμηθευτών. Αναβάθμισε σε Pro για να προσθέσεις κι άλλους.",
          );
        }
      },
    });
  };

  const heartIcon: ComponentProps<typeof IconSymbol>["name"] = isFavorite ? "heart.fill" : "heart";
  const iconColor = isFavorite ? colors.primary : colors.muted;

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        isFavorite
          ? `Αφαίρεση από αγαπημένα: ${supplier.name}`
          : `Αποθήκευση στα αγαπημένα: ${supplier.name}`
      }
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background"
      disabled={busy}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <IconSymbol name={heartIcon} size={22} color={iconColor} />
      )}
    </TouchableOpacity>
  );
}

/**
 * B2 supplier list card. Used both in the buyer suppliers tab and in favorites.
 */
export function SupplierCard({ supplier, onPress, favoriteAccessory }: SupplierCardProps) {
  const colors = useColors();
  const initials = getInitials(supplier.name);

  // Onboarding state — αν λείπει το flag (legacy/mocks/προηγούμενα APIs)
  // υποθέτουμε «onboarded» ώστε να μην μαρκάρουμε λάθος rich profiles.
  const isFresh = supplier.isOnboarded === false;

  const cardPaddingWithHeart = `${favoriteAccessory !== undefined ? "pr-[52px]" : ""}`;

  return (
    <View className="relative">
      {favoriteAccessory ? (
        <View className="absolute right-2 top-2 z-10" pointerEvents="box-none">
          {favoriteAccessory}
        </View>
      ) : null}

      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Άνοιγμα προφίλ: ${supplier.name}`}
        className={`rounded-[24px] border border-border bg-surface p-4 ${cardPaddingWithHeart}`}
      >
        <View className="flex-row items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Text className="text-base font-bold text-primary">{initials}</Text>
          </View>

          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={1}>
                {supplier.name}
              </Text>
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
            </View>

            <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
              {!isFresh ? <StarRating rating={supplier.rating} /> : null}
              <Text className="text-sm text-muted">
                {isFresh ? supplier.category : `· ${supplier.category}`}
              </Text>
            </View>
          </View>
        </View>

        {!isFresh ? (
          <Text className="mt-3 text-sm leading-6 text-foreground">{supplier.highlight}</Text>
        ) : (
          <Text className="mt-3 text-sm italic leading-6 text-muted">Συμπληρώνει το προφίλ του.</Text>
        )}

        <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
          <View className="flex-row items-center gap-1">
            <IconSymbol name="mappin.and.ellipse" size={13} color={colors.muted} />
            <Text className="text-xs font-medium text-muted">{supplier.location}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <IconSymbol name="clock.fill" size={13} color={colors.muted} />
            <Text className="text-xs font-medium text-muted">{supplier.deliveryTime}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <IconSymbol name="shippingbox.fill" size={13} color={colors.muted} />
            <Text className="text-xs font-medium text-muted">MOQ {supplier.minimumOrder}</Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-border pt-3">
          <Text className="text-sm font-semibold text-primary">Άνοιγμα καταλόγου</Text>
          <IconSymbol name="chevron.right" size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
