import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, apiRequest } from "@/lib/api/http";
import type { Order, Product, Supplier } from "@/lib/mocks/horeca";

export type ProductDetail = Product & { description: string; supplierName: string };

/**
 * Supplier's own product (includes raw availability status so UI can render
 * a toggle without re-parsing the localized label). C4b θα χρησιμοποιήσει
 * το `availabilityStatus` για mutation.
 */
export type SupplierOwnProduct = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  price: string;
  priceEur: string;
  availability: "Άμεσα διαθέσιμο" | "Περιορισμένο";
  availabilityStatus: "immediate" | "limited";
  category: string;
};

export type SupplierOwnCatalog = {
  supplierId: string | null;
  supplierName: string | null;
  products: SupplierOwnProduct[];
};

export const horecaQueryKeys = {
  supplierCategories: ["horeca", "supplierCategories"] as const,
  suppliers: (category?: string) => ["horeca", "suppliers", category ?? "all"] as const,
  featuredProducts: (limit: number) => ["horeca", "featuredProducts", limit] as const,
  recentOrders: (limit: number, locationId?: string | null) =>
    ["horeca", "recentOrders", limit, locationId ?? "all"] as const,
  buyerLocations: ["horeca", "buyerLocations"] as const,
  incomingInvitations: ["horeca", "incomingInvitations"] as const,
  locationMembers: (locationId: string) => ["horeca", "locationMembers", locationId] as const,
  supplierById: (id: number) => ["horeca", "supplier", id] as const,
  productsBySupplier: (supplierId: number) => ["horeca", "productsBySupplier", supplierId] as const,
  productById: (id: number) => ["horeca", "product", id] as const,
  supplierOperationalSummary: ["horeca", "supplierOperationalSummary"] as const,
  supplierOwnProducts: ["horeca", "supplierOwnProducts"] as const,
  orderById: (publicId: string) => ["horeca", "order", publicId] as const,
  supplierProfile: ["horeca", "supplierProfile"] as const,
  monthlyOrderUsage: ["horeca", "monthlyOrderUsage"] as const,
  favorites: ["horeca", "favorites"] as const,
  priceAlerts: ["horeca", "priceAlerts"] as const,
  notificationPreferences: ["horeca", "notificationPreferences"] as const,
  buyerSpending: (months: 3 | 6 | 12) => ["horeca", "buyerSpending", months] as const,
};

export function useSupplierCategoriesQuery() {
  return useQuery({
    queryKey: horecaQueryKeys.supplierCategories,
    queryFn: async () => {
      const data = await apiRequest<{ categories: string[] }>("/api/catalog/categories");
      return data.categories;
    },
  });
}

export function useSuppliersListQuery(options?: { category?: string }) {
  const category = options?.category;
  return useQuery({
    queryKey: horecaQueryKeys.suppliers(category),
    queryFn: async (): Promise<Supplier[]> => {
      const q = category ? `?category=${encodeURIComponent(category)}` : "";
      const data = await apiRequest<{ suppliers: Supplier[] }>(`/api/catalog/suppliers${q}`);
      return data.suppliers;
    },
  });
}

export function useFeaturedProductsQuery(options?: { limit?: number }) {
  const limit = options?.limit ?? 10;
  return useQuery({
    queryKey: horecaQueryKeys.featuredProducts(limit),
    queryFn: async (): Promise<Product[]> => {
      const data = await apiRequest<{ products: Product[] }>(
        `/api/catalog/products/featured?limit=${limit}`,
      );
      return data.products;
    },
  });
}

export function useRecentOrdersQuery(options?: {
  limit?: number;
  /** Φάση 3.1 · φίλτρο εμφάνισης μόνο για ενεργό κατάστημα του buyer· null/omit = όλα. */
  locationId?: string | null;
}) {
  const limit = options?.limit ?? 20;
  const locationId =
    typeof options?.locationId === "string" && options.locationId.length > 0
      ? options.locationId
      : null;

  const qLoc = locationId != null ? `&locationId=${encodeURIComponent(locationId)}` : "";

  return useQuery({
    queryKey: horecaQueryKeys.recentOrders(limit, locationId ?? undefined),
    queryFn: async (): Promise<Order[]> => {
      try {
        const data = await apiRequest<{ orders: Order[] }>(
          `/api/orders/recent?limit=${limit}${qLoc}`,
          { auth: true },
        );
        return data.orders;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          return [];
        }
        throw e;
      }
    },
  });
}

export function useFavoritesQuery() {
  return useQuery({
    queryKey: horecaQueryKeys.favorites,
    queryFn: async (): Promise<Supplier[]> => {
      try {
        const data = await apiRequest<{ suppliers: Supplier[] }>("/api/me/favorites", {
          auth: true,
        });
        return data.suppliers;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          return [];
        }
        throw e;
      }
    },
  });
}

type FavoriteSuppliersCacheSnap = { previous: Supplier[] | undefined };

export function useAddFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: Supplier) => {
      const data = await apiRequest<{ suppliers: Supplier[] }>("/api/me/favorites", {
        method: "POST",
        body: JSON.stringify({ supplierId: Number(supplier.id) }),
        auth: true,
      });
      return data.suppliers;
    },
    onMutate: async (supplier): Promise<FavoriteSuppliersCacheSnap> => {
      await queryClient.cancelQueries({ queryKey: horecaQueryKeys.favorites });
      const previous = queryClient.getQueryData<Supplier[]>(horecaQueryKeys.favorites);
      queryClient.setQueryData<Supplier[]>(horecaQueryKeys.favorites, (old) => {
        const list = old ?? [];
        if (list.some((s) => s.id === supplier.id)) return list;
        return [...list, supplier];
      });
      return { previous };
    },
    onError: (_e, _supplier, ctx) => {
      queryClient.setQueryData(horecaQueryKeys.favorites, ctx?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.favorites });
    },
  });
}

export function useRemoveFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplierId: string) => {
      const data = await apiRequest<{ suppliers: Supplier[] }>(
        `/api/me/favorites/${encodeURIComponent(supplierId)}`,
        { method: "DELETE", auth: true },
      );
      return data.suppliers;
    },
    onMutate: async (supplierId): Promise<FavoriteSuppliersCacheSnap> => {
      await queryClient.cancelQueries({ queryKey: horecaQueryKeys.favorites });
      const previous = queryClient.getQueryData<Supplier[]>(horecaQueryKeys.favorites);
      queryClient.setQueryData<Supplier[]>(horecaQueryKeys.favorites, (old) =>
        (old ?? []).filter((s) => s.id !== supplierId),
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      queryClient.setQueryData(horecaQueryKeys.favorites, ctx?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.favorites });
    },
  });
}

export type BuyerLocationWire = {
  id: string;
  ownerUserId: string;
  name: string;
  address: string;
  role: string;
  memberCount: number;
  pendingInviteCount: number;
  isOwner: boolean;
  createdAt: number;
};

export type IncomingInvitationWire = {
  token: string;
  email: string;
  locationId: string;
  locationName: string;
  createdAt: number;
};

function invalidateBuyerLocationBundles(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: horecaQueryKeys.buyerLocations });
  queryClient.invalidateQueries({ queryKey: horecaQueryKeys.incomingInvitations });
}

export function useBuyerLocationsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: horecaQueryKeys.buyerLocations,
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<BuyerLocationWire[]> => {
      try {
        const data = await apiRequest<{ locations: BuyerLocationWire[] }>("/api/me/locations", {
          auth: true,
        });
        return data.locations;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return [];
        throw e;
      }
    },
  });
}

export function useIncomingInvitationsQuery() {
  return useQuery({
    queryKey: horecaQueryKeys.incomingInvitations,
    queryFn: async (): Promise<IncomingInvitationWire[]> => {
      try {
        const data = await apiRequest<{ invitations: IncomingInvitationWire[] }>(
          "/api/me/invitations/incoming",
          { auth: true },
        );
        return data.invitations;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return [];
        throw e;
      }
    },
  });
}

export function useBuyerLocationMembersQuery(options: {
  locationId: string | undefined;
  enabled?: boolean;
}) {
  const { locationId } = options;
  return useQuery({
    queryKey: horecaQueryKeys.locationMembers(locationId ?? ""),
    enabled: Boolean(locationId) && (options.enabled ?? true),
    queryFn: async () => {
      const data = await apiRequest<{ members: { userId: string; name: string; email: string; role: string }[] }>(
        `/api/me/locations/${encodeURIComponent(locationId!)}/members`,
        { auth: true },
      );
      return data.members;
    },
  });
}

export function useCreateBuyerLocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; address?: string }) => {
      return apiRequest<{ location: BuyerLocationWire }>(`/api/me/locations`, {
        method: "POST",
        body: JSON.stringify(body),
        auth: true,
      });
    },
    onSuccess: () => invalidateBuyerLocationBundles(queryClient),
  });
}

export function usePatchBuyerLocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { locationId: string; name?: string; address?: string }) => {
      return apiRequest<{ location: BuyerLocationWire }>(
        `/api/me/locations/${encodeURIComponent(input.locationId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: input.name, address: input.address }),
          auth: true,
        },
      );
    },
    onSuccess: () => invalidateBuyerLocationBundles(queryClient),
  });
}

export function useDeleteBuyerLocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (locationId: string) =>
      apiRequest<void>(`/api/me/locations/${encodeURIComponent(locationId)}`, {
        method: "DELETE",
        auth: true,
      }),
    onSuccess: () => invalidateBuyerLocationBundles(queryClient),
  });
}

export function useInviteToLocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { locationId: string; email: string }) => {
      return apiRequest(`/api/me/locations/${encodeURIComponent(input.locationId)}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: input.email.trim() }),
        auth: true,
      });
    },
    onSuccess: (_d, vars) => {
      invalidateBuyerLocationBundles(queryClient);
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.locationMembers(vars.locationId) });
    },
  });
}

export function useRemoveTeamMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { locationId: string; memberUserId: string }) =>
      apiRequest<void>(
        `/api/me/locations/${encodeURIComponent(input.locationId)}/members/${encodeURIComponent(input.memberUserId)}`,
        { method: "DELETE", auth: true },
      ),
    onSuccess: (_v, vars) => {
      invalidateBuyerLocationBundles(queryClient);
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.locationMembers(vars.locationId) });
    },
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) =>
      apiRequest(`/api/me/invitations/accept`, {
        method: "POST",
        body: JSON.stringify({ token }),
        auth: true,
      }),
    onSuccess: () => {
      invalidateBuyerLocationBundles(queryClient);
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "horeca" && q.queryKey[1] === "locationMembers",
      });
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "horeca" && q.queryKey[1] === "recentOrders",
      });
    },
  });
}

export function useDeclineInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) =>
      apiRequest(`/api/me/invitations/decline`, {
        method: "POST",
        body: JSON.stringify({ token }),
        auth: true,
      }),
    onSuccess: () => invalidateBuyerLocationBundles(queryClient),
  });
}

export function useSupplierByIdQuery(options: { id: number; enabled?: boolean }) {
  const { id, enabled = true } = options;
  return useQuery({
    queryKey: horecaQueryKeys.supplierById(id),
    enabled,
    queryFn: async (): Promise<Supplier | null> => {
      const data = await apiRequest<{ supplier: Supplier | null }>(
        `/api/catalog/suppliers/${id}`,
      );
      return data.supplier;
    },
  });
}

export function useProductsBySupplierQuery(options: { supplierId: number; enabled?: boolean }) {
  const { supplierId, enabled = true } = options;
  return useQuery({
    queryKey: horecaQueryKeys.productsBySupplier(supplierId),
    enabled,
    queryFn: async (): Promise<Product[]> => {
      const data = await apiRequest<{ products: Product[] }>(
        `/api/catalog/suppliers/${supplierId}/products`,
      );
      return data.products;
    },
  });
}

export function useProductByIdQuery(options: { id: number }) {
  const { id } = options;
  return useQuery({
    queryKey: horecaQueryKeys.productById(id),
    queryFn: async (): Promise<ProductDetail | null> => {
      const data = await apiRequest<{ product: ProductDetail | null }>(
        `/api/catalog/products/${id}`,
      );
      return data.product;
    },
  });
}

/**
 * Products belonging to the authenticated supplier's storefront. Returns an
 * empty catalog (no listing) if the user has no `suppliers.ownerUserId` link.
 */
export function useSupplierOwnProductsQuery() {
  return useQuery({
    queryKey: horecaQueryKeys.supplierOwnProducts,
    queryFn: async (): Promise<SupplierOwnCatalog> => {
      try {
        return await apiRequest<SupplierOwnCatalog>("/api/supplier/products", { auth: true });
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          return { supplierId: null, supplierName: null, products: [] };
        }
        throw e;
      }
    },
  });
}

/**
 * Toggles a single product's availability between `immediate` and `limited`.
 * Uses an optimistic update so the pill flips instantly· on error we roll back
 * the cache to the previous snapshot. Also invalidates buyer-facing catalog
 * queries so the new availability is reflected across the app.
 */
export function useToggleSupplierProductAvailabilityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      productId: string;
      availability: "immediate" | "limited";
    }) => {
      return await apiRequest<{ product: SupplierOwnProduct }>(
        `/api/supplier/products/${input.productId}/availability`,
        {
          method: "PATCH",
          body: JSON.stringify({ availability: input.availability }),
          auth: true,
        },
      );
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: horecaQueryKeys.supplierOwnProducts });
      const previous = queryClient.getQueryData<SupplierOwnCatalog>(
        horecaQueryKeys.supplierOwnProducts,
      );
      if (previous) {
        const displayLabel: SupplierOwnProduct["availability"] =
          input.availability === "immediate" ? "Άμεσα διαθέσιμο" : "Περιορισμένο";
        queryClient.setQueryData<SupplierOwnCatalog>(horecaQueryKeys.supplierOwnProducts, {
          ...previous,
          products: previous.products.map((p) =>
            p.id === input.productId
              ? { ...p, availabilityStatus: input.availability, availability: displayLabel }
              : p,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(horecaQueryKeys.supplierOwnProducts, context.previous);
      }
    },
    onSettled: () => {
      // Supplier's own list + downstream buyer views must all re-fetch so the
      // availability change propagates everywhere (featured list, supplier
      // profile products, single product detail).
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.supplierOwnProducts });
      queryClient.invalidateQueries({ queryKey: ["horeca", "featuredProducts"] });
      queryClient.invalidateQueries({ queryKey: ["horeca", "productsBySupplier"] });
      queryClient.invalidateQueries({ queryKey: ["horeca", "product"] });
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.supplierOperationalSummary });
    },
  });
}

/**
 * Shared input type για create/update — τα ίδια πεδία, απλώς το update είναι
 * partial. Το `priceEur` είναι string (decimal e.g. "19.90") και το
 * `availability` raw status — έτσι αποφεύγουμε re-parsing των localized labels.
 */
export type SupplierProductInput = {
  name: string;
  unit: string;
  category: string;
  priceEur: string;
  description?: string | null;
  availability?: "immediate" | "limited";
};

export type SupplierProductUpdate = Partial<SupplierProductInput>;

/**
 * Invalidates τόσο την supplier catalog list όσο και τις buyer-facing caches
 * (featured/list/detail/operational summary) — οι αλλαγές διαδίδονται παντού.
 * Κοινό helper για τα 3 mutations ώστε να μη διαφοροποιείται η συμπεριφορά.
 */
function invalidateProductCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: horecaQueryKeys.supplierOwnProducts });
  queryClient.invalidateQueries({ queryKey: ["horeca", "featuredProducts"] });
  queryClient.invalidateQueries({ queryKey: ["horeca", "productsBySupplier"] });
  queryClient.invalidateQueries({ queryKey: ["horeca", "product"] });
  queryClient.invalidateQueries({ queryKey: horecaQueryKeys.supplierOperationalSummary });
}

/**
 * Δημιουργία νέου προϊόντος. Δεν κάνουμε optimistic insert γιατί χρειαζόμαστε
 * το server-assigned id — απλώς invalidate στο success για να επαναφορτωθεί
 * η λίστα με το νέο record.
 */
export function useCreateSupplierProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupplierProductInput) => {
      return await apiRequest<{ product: SupplierOwnProduct }>("/api/supplier/products", {
        method: "POST",
        body: JSON.stringify(input),
        auth: true,
      });
    },
    onSuccess: () => invalidateProductCaches(queryClient),
  });
}

/**
 * Επεξεργασία προϊόντος με optimistic update πάνω στην cached supplier list.
 * Rollback on error· invalidate on settled για να διαδώσει στα buyer views.
 */
export function useUpdateSupplierProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productId: string; changes: SupplierProductUpdate }) => {
      return await apiRequest<{ product: SupplierOwnProduct }>(
        `/api/supplier/products/${input.productId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input.changes),
          auth: true,
        },
      );
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: horecaQueryKeys.supplierOwnProducts });
      const previous = queryClient.getQueryData<SupplierOwnCatalog>(
        horecaQueryKeys.supplierOwnProducts,
      );
      if (previous) {
        queryClient.setQueryData<SupplierOwnCatalog>(horecaQueryKeys.supplierOwnProducts, {
          ...previous,
          products: previous.products.map((p) => {
            if (p.id !== input.productId) return p;
            const next: SupplierOwnProduct = { ...p };
            if (input.changes.name !== undefined) next.name = input.changes.name;
            if (input.changes.unit !== undefined) next.unit = input.changes.unit;
            if (input.changes.category !== undefined) next.category = input.changes.category;
            if (input.changes.description !== undefined) next.description = input.changes.description;
            if (input.changes.priceEur !== undefined) {
              next.priceEur = input.changes.priceEur;
              next.price = `${input.changes.priceEur} €`;
            }
            if (input.changes.availability !== undefined) {
              next.availabilityStatus = input.changes.availability;
              next.availability =
                input.changes.availability === "immediate" ? "Άμεσα διαθέσιμο" : "Περιορισμένο";
            }
            return next;
          }),
        });
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(horecaQueryKeys.supplierOwnProducts, context.previous);
      }
    },
    onSettled: () => invalidateProductCaches(queryClient),
  });
}

/**
 * Διαγραφή προϊόντος με optimistic removal από την cached list + rollback on
 * error. 204 No Content → δεν περιμένουμε JSON body.
 */
export function useDeleteSupplierProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productId: string }) => {
      await apiRequest<void>(`/api/supplier/products/${input.productId}`, {
        method: "DELETE",
        auth: true,
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: horecaQueryKeys.supplierOwnProducts });
      const previous = queryClient.getQueryData<SupplierOwnCatalog>(
        horecaQueryKeys.supplierOwnProducts,
      );
      if (previous) {
        queryClient.setQueryData<SupplierOwnCatalog>(horecaQueryKeys.supplierOwnProducts, {
          ...previous,
          products: previous.products.filter((p) => p.id !== input.productId),
        });
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(horecaQueryKeys.supplierOwnProducts, context.previous);
      }
    },
    onSettled: () => invalidateProductCaches(queryClient),
  });
}

// ─── Order creation (POST /api/orders) ─────────────────────────────────────

/**
 * Wire payload για create — μόνο IDs & quantities. Το backend υπολογίζει
 * τιμές/totals από DB (zero-trust). Δεν εκθέτουμε `priceEur` εδώ ώστε ο
 * client να μην μπει σε πειρασμό να στείλει «δικιά του» τιμή.
 */
export type CreateOrderInput = {
  supplierId: number;
  items: { productId: number; qty: number }[];
  deliveryWindow?: string;
  notes?: string;
  /** Φάση 3.1: buyer location tag — ο server επιτρέπει μόνο μέλη του location. */
  locationId?: number;
};

export type OrderLineItem = {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  qty: number;
  unitPrice: string;
  unitPriceEur: number;
  lineTotal: string;
  lineTotalEur: number;
};

/**
 * Πλήρης παραγγελία με γραμμές, notes, totalEur και timestamps. Επιστρέφεται
 * από POST /api/orders (create) ΚΑΙ GET /api/orders/:publicId (detail), οπότε
 * το ίδιο type εξυπηρετεί και τα δύο call sites.
 */
export type OrderDetail = Order & {
  publicId: string;
  /** SQL row id του supplier — useful για navigation στο supplier-profile. */
  supplierId: string;
  totalEur: number;
  notes: string | null;
  /** Unix epoch (sec) από SQLite. Optional για backwards compat με create. */
  createdAt?: number;
  /**
   * Από Φάση 0.5: ο server λέει στον client ποιον ρόλο έχει ο τρέχων user σε
   * σχέση με αυτή την παραγγελία. Αυτό οδηγεί τα CTA buttons (supplier actions
   * vs buyer reorder) χωρίς να χρειάζεται extra `useMe()` round-trip.
   */
  viewerRole: "buyer" | "supplier";
  items: OrderLineItem[];
};

/**
 * Wire status values — αυτά στέλνει ο client στο PATCH. Δεν περιλαμβάνεται το
 * `new` (αρχικό status, δεν μεταβαίνει κανείς πίσω σε αυτό) ούτε terminal
 * states γιατί ο server θα απορρίψει re-transitions με 409.
 */
export type OrderStatusTransition = "processing" | "in_transit" | "completed" | "cancelled";

/** @deprecated Διατηρείται για συμβατότητα call-sites που import-άρανε τον παλιό τύπο. */
export type CreatedOrder = OrderDetail;

/** Φάση 2.1: μηνιαίο μετρητή παραγγελιών buyer (Δωρεάν cap). Συνοδευτικό του `/api/me/orders/usage`. */
export type MonthlyOrderUsage = {
  used: number;
  /** `null` όταν είναι Pro (= απεριόριστο). */
  limit: number | null;
  isUnlimited: boolean;
  resetsAt: string;
};

/**
 * Φέρνει `used/limit/resetsAt` για buyer. Supplier session πάει 403 από το backend —
 * το `(tabs)/orders` shell είναι για buyers· αν γίνεται 403 στο production,
 * ρίχνει error· εδώ αφήνουμε το react-query default (όχι silent swallow).
 */
export function useMonthlyOrderUsageQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: horecaQueryKeys.monthlyOrderUsage,
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<MonthlyOrderUsage> =>
      apiRequest<MonthlyOrderUsage>("/api/me/orders/usage", { auth: true }),
  });
}

/**
 * Φέρνει μία παραγγελία με όλα τα line items + notes. Disabled αν δεν έχουμε
 * `publicId` ακόμη (πχ deep-link χωρίς param). Δεν fallbackάρει σιωπηλά σε []
 * επί 401/403/404 όπως το `recentOrders`: στο detail screen θέλουμε να ξέρουμε
 * αν είναι "δεν βρέθηκε" vs "δεν συνδέθηκε".
 */
export function useOrderQuery(options: { publicId: string | undefined }) {
  const { publicId } = options;
  return useQuery({
    queryKey: horecaQueryKeys.orderById(publicId ?? ""),
    enabled: Boolean(publicId),
    queryFn: async (): Promise<OrderDetail | null> => {
      try {
        const data = await apiRequest<{ order: OrderDetail }>(
          `/api/orders/${encodeURIComponent(publicId!)}`,
          { auth: true },
        );
        return data.order;
      } catch (e) {
        // 404 = δεν υπάρχει ή ο user δεν έχει access (το server γυρνά 404 και
        // στις 2 περιπτώσεις για enumeration protection). Treat as "no data".
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
}

/**
 * Δημιουργία μίας παραγγελίας. Το checkout κάνει loop ανά supplier. Στο success
 * invalidates τις λίστες και το `/api/me/orders/usage` (Φάση 2.1).
 */
export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<OrderDetail> => {
      const data = await apiRequest<{ order: OrderDetail }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(input),
        auth: true,
      });
      return data.order;
    },
    onSuccess: (order) => {
      // recentOrders δέχεται διαφορετικά limits — invalidate ολόκληρο το prefix
      // ώστε να ξανατραβηχτούν όλα τα cached variants. Το supplier dashboard
      // KPI summary επίσης παίρνει refresh για το «νέες παραγγελίες» count.
      queryClient.invalidateQueries({ queryKey: ["horeca", "recentOrders"] });
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.supplierOperationalSummary });
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.monthlyOrderUsage });
      queryClient.invalidateQueries({ queryKey: ["horeca", "buyerSpending"] });
      // Prepopulate το per-id cache — αν ο user πατήσει αμέσως την παραγγελία
      // από το orders tab, ανοίγει instant χωρίς round-trip.
      queryClient.setQueryData(horecaQueryKeys.orderById(order.publicId), order);
    },
  });
}

// ─── Supplier profile (storefront editing) ─────────────────────────────────

/**
 * Editable fields του storefront. Όλα optional ώστε ο client να στείλει partial
 * payload (PATCH semantics). `rating`, `verified`, `latitude/longitude` δεν
 * εκτίθενται εδώ — δες server comments για τον λόγο.
 */
export type UpdateSupplierProfileInput = {
  name?: string;
  category?: string;
  location?: string;
  deliveryTime?: string;
  minimumOrder?: string;
  highlight?: string;
};

/**
 * Φέρνει τα δεδομένα του storefront του τρέχοντος supplier user. 404 αν ο user
 * δεν έχει storefront (πχ legacy account που δημιουργήθηκε πριν τη Φάση 0.6
 * χωρίς auto-create). Δεν fallback-άρουμε σιωπηλά σε null εδώ ώστε το screen
 * να μπορεί να δείξει «δεν βρέθηκε storefront» empty state.
 */
export function useSupplierProfileQuery() {
  return useQuery({
    queryKey: horecaQueryKeys.supplierProfile,
    queryFn: async (): Promise<Supplier | null> => {
      try {
        const data = await apiRequest<{ supplier: Supplier }>("/api/supplier/profile", {
          auth: true,
        });
        return data.supplier;
      } catch (e) {
        // 401/403 = ο user δεν είναι supplier ή χωρίς session. 404 = δεν έχει
        // storefront. Treat all ως "no profile to show" ώστε το UI να γυρίσει
        // empty state αντί για error toast.
        if (e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) {
          return null;
        }
        throw e;
      }
    },
  });
}

/**
 * Ενημέρωση του supplier profile. Στο success refresh-άρουμε όλα τα places που
 * δείχνουν supplier metadata:
 * - per-id cache (αν κάποιος buyer το έχει ανοιχτό)
 * - suppliers list (μπορεί να έχει αλλάξει category → reshuffle στα filters)
 * - supplierOwnProducts (το header «X products από Y supplier» δείχνει name)
 */
export function useUpdateSupplierProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSupplierProfileInput): Promise<Supplier> => {
      const data = await apiRequest<{ supplier: Supplier }>("/api/supplier/profile", {
        method: "PATCH",
        body: JSON.stringify(input),
        auth: true,
      });
      return data.supplier;
    },
    onSuccess: (supplier) => {
      queryClient.setQueryData(horecaQueryKeys.supplierProfile, supplier);
      // per-id cache update αν τυχόν κάποιος έχει ανοιχτό το buyer-side
      // supplier-profile screen
      const supplierId = Number(supplier.id);
      if (Number.isFinite(supplierId)) {
        queryClient.setQueryData(horecaQueryKeys.supplierById(supplierId), supplier);
      }
      // Suppliers list δέχεται διαφορετικά category filters — invalidate
      // ολόκληρο το prefix ώστε να ξανατραβηχτούν όλα τα cached variants.
      queryClient.invalidateQueries({ queryKey: ["horeca", "suppliers"] });
      // Categories list μπορεί να αλλάξει αν είναι ο μόνος supplier σε μια
      // κατηγορία και κάνει switch.
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.supplierCategories });
      // Το header στο supplier-tabs catalog screen τραβά το όνομα από εδώ.
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.supplierOwnProducts });
    },
  });
}

/**
 * Supplier action mutation για state transitions (Accept/Reject/Mark Delivered
 * κ.λπ.). Ο server κρατά τον πλήρη state machine — εμείς απλά στέλνουμε το
 * επόμενο status και ενημερώνουμε το cache.
 *
 * Cache strategy: αντί για πλήρες invalidate που θα έκανε spinner στο detail
 * screen, κάνουμε `setQueryData` στο per-id cache (ο server επιστρέφει το
 * πλήρες updated order). Παράλληλα invalidate-άρουμε τη λίστα ώστε η πιθανή
 * επαναταξινόμηση/κατηγοριοποίηση «νέες vs σε εξέλιξη» να ξανατρέξει.
 */
export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      publicId: string;
      status: OrderStatusTransition;
    }): Promise<OrderDetail> => {
      const data = await apiRequest<{ order: OrderDetail }>(
        `/api/orders/${encodeURIComponent(input.publicId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: input.status }),
          auth: true,
        },
      );
      return data.order;
    },
    onSuccess: (order) => {
      queryClient.setQueryData(horecaQueryKeys.orderById(order.publicId), order);
      queryClient.invalidateQueries({ queryKey: ["horeca", "recentOrders"] });
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.supplierOperationalSummary });
    },
  });
}

export function useSupplierOperationalSummaryQuery() {
  return useQuery({
    queryKey: horecaQueryKeys.supplierOperationalSummary,
    queryFn: async () => {
      try {
        return await apiRequest<{
          newOrders: number;
          processingOrders: number;
          lowStockItems: number;
          todayRevenue: string;
        }>("/api/supplier/operational-summary", { auth: true });
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          return {
            newOrders: 0,
            processingOrders: 0,
            lowStockItems: 0,
            todayRevenue: "—",
          };
        }
        throw e;
      }
    },
  });
}

// ─── Buyer price alerts (Pro · Φάση 3.2) ────────────────────────────────────

/** Wire του `serializePriceAlertRow` στο `platform/app.ts`. */
export type BuyerPriceAlertWire = {
  id: string;
  productId: string;
  productName: string;
  supplierName: string;
  currentPriceEur: number;
  threshold: string;
  active: boolean;
  armed: boolean;
  triggeredAt: number | null;
  createdAt: number;
};

export function usePriceAlertsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: horecaQueryKeys.priceAlerts,
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<BuyerPriceAlertWire[]> => {
      try {
        const data = await apiRequest<{ alerts: BuyerPriceAlertWire[] }>("/api/me/price-alerts", {
          auth: true,
        });
        return data.alerts;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          return [];
        }
        throw e;
      }
    },
  });
}

export function useCreatePriceAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productId: number; thresholdEur: number }): Promise<BuyerPriceAlertWire> => {
      const data = await apiRequest<{ alert: BuyerPriceAlertWire }>("/api/me/price-alerts", {
        method: "POST",
        body: JSON.stringify({
          productId: input.productId,
          thresholdEur: input.thresholdEur,
        }),
        auth: true,
      });
      return data.alert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.priceAlerts });
    },
  });
}

export type UpdatePriceAlertMutationInput = {
  id: string;
  thresholdEur?: number;
  active?: boolean;
};

export function useUpdatePriceAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePriceAlertMutationInput): Promise<BuyerPriceAlertWire> => {
      const patch: Record<string, unknown> = {};
      if (input.thresholdEur !== undefined) patch.thresholdEur = input.thresholdEur;
      if (input.active !== undefined) patch.active = input.active;

      const data = await apiRequest<{ alert: BuyerPriceAlertWire }>(
        `/api/me/price-alerts/${encodeURIComponent(input.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
          auth: true,
        },
      );
      return data.alert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.priceAlerts });
    },
  });
}

export function useDeletePriceAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      await apiRequest(`/api/me/price-alerts/${encodeURIComponent(input.id)}`, {
        method: "DELETE",
        auth: true,
      });
      return input.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horecaQueryKeys.priceAlerts });
    },
  });
}

/** Mirror του `BuyerSpendingPayload` στο backend (`aggregateBuyerSpending`). */
export type BuyerSpendingPayload = {
  grandTotalEur: number;
  rangeFromMs: number;
  rangeToMs: number;
  appliedWindowLabel: string;
  months: { monthKey: string; label: string; totalEur: number }[];
  byCategory: { category: string; totalEur: number }[];
  topSuppliers: { supplierId: string; supplierName: string; totalEur: number }[];
};

export type SpendingMonthsParam = 3 | 6 | 12;

/** Φάση 3.3 · buyer-only — επιστροφές 403 για supplier session. */
export function useBuyerSpendingQuery(options: { months: SpendingMonthsParam; enabled?: boolean }) {
  const months = options.months;
  return useQuery({
    queryKey: horecaQueryKeys.buyerSpending(months),
    enabled: options.enabled ?? true,
    queryFn: async (): Promise<BuyerSpendingPayload> => {
      const data = await apiRequest<{ spending: BuyerSpendingPayload }>(
        `/api/me/spending?months=${months}`,
        { auth: true },
      );
      return data.spending;
    },
  });
}

export type NotificationPreferences = {
  priceAlertEmailDigest: boolean;
};

/**
 * Προτιμήσεις ειδοποιήσεων (τώρα: digest email για price hits μέσω Resend).
 */
export function useNotificationPreferencesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: horecaQueryKeys.notificationPreferences,
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<NotificationPreferences> => {
      try {
        return await apiRequest<NotificationPreferences>("/api/me/notification-preferences", {
          auth: true,
        });
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          return { priceAlertEmailDigest: true };
        }
        throw e;
      }
    },
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotificationPreferences): Promise<NotificationPreferences> => {
      return apiRequest<NotificationPreferences>("/api/me/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(input),
        auth: true,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(horecaQueryKeys.notificationPreferences, data);
    },
  });
}
