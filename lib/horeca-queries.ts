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
