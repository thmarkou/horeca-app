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
  recentOrders: (limit: number) => ["horeca", "recentOrders", limit] as const,
  supplierById: (id: number) => ["horeca", "supplier", id] as const,
  productsBySupplier: (supplierId: number) => ["horeca", "productsBySupplier", supplierId] as const,
  productById: (id: number) => ["horeca", "product", id] as const,
  supplierOperationalSummary: ["horeca", "supplierOperationalSummary"] as const,
  supplierOwnProducts: ["horeca", "supplierOwnProducts"] as const,
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

export function useRecentOrdersQuery(options?: { limit?: number }) {
  const limit = options?.limit ?? 20;
  return useQuery({
    queryKey: horecaQueryKeys.recentOrders(limit),
    queryFn: async (): Promise<Order[]> => {
      try {
        const data = await apiRequest<{ orders: Order[] }>(
          `/api/orders/recent?limit=${limit}`,
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

export function useSupplierByIdQuery(options: { id: number }) {
  const { id } = options;
  return useQuery({
    queryKey: horecaQueryKeys.supplierById(id),
    queryFn: async (): Promise<Supplier | null> => {
      const data = await apiRequest<{ supplier: Supplier | null }>(
        `/api/catalog/suppliers/${id}`,
      );
      return data.supplier;
    },
  });
}

export function useProductsBySupplierQuery(options: { supplierId: number }) {
  const { supplierId } = options;
  return useQuery({
    queryKey: horecaQueryKeys.productsBySupplier(supplierId),
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
