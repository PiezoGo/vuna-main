"use client";

import type { Product } from "@vuna/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@/lib/api/client";
import { sendForm } from "@/lib/api/form-upload";
import { unwrap } from "@/lib/api/result";

export const listingKeys = {
  mine: (farmer?: string) => ["listings", "mine", farmer ?? "me"] as const,
  one: (id: number) => ["listings", id] as const,
  summary: ["farmer", "summary"] as const,
  paid: ["farmer", "paid-orders"] as const,
  agentFarmers: ["agent", "farmers"] as const,
};

/** The signed-in farmer's listings, or a linked farmer's when an agent passes their uid. */
export function useMyListings(farmer?: string) {
  return useQuery({
    queryKey: listingKeys.mine(farmer),
    // With my_listings the API returns a plain list, not the paginated market shape the schema describes.
    queryFn: async () =>
      (await unwrap(
        clientApi.GET("/api/products/", {
          params: { query: { my_listings: "true", ...(farmer ? { farmer } : {}) } },
        }),
      )) as unknown as Product[],
  });
}

export function useListing(id: number) {
  return useQuery({
    queryKey: listingKeys.one(id),
    queryFn: () => unwrap(clientApi.GET("/api/products/{id}/", { params: { path: { id } } })),
  });
}

/** Create (no id) or update a listing, with photos, as multipart form data. */
export function useSaveListing(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) =>
      id
        ? sendForm<Product>("PATCH", `/api/products/${id}/`, form)
        : sendForm<Product>("POST", "/api/products/", form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useSetListingActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      unwrap(
        clientApi.PATCH("/api/products/{id}/", {
          params: { path: { id } },
          body: { is_active: active },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useRemoveListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(clientApi.DELETE("/api/products/{id}/", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useFarmerSummary() {
  return useQuery({
    queryKey: listingKeys.summary,
    queryFn: () => unwrap(clientApi.GET("/api/farmer/summary/")),
  });
}

export function usePaidOrders() {
  return useQuery({
    queryKey: listingKeys.paid,
    queryFn: () => unwrap(clientApi.GET("/api/orders/", { params: { query: { paid: "true" } } })),
  });
}

export function useAgentFarmers() {
  return useQuery({
    queryKey: listingKeys.agentFarmers,
    queryFn: () => unwrap(clientApi.GET("/api/agent/farmers/")),
  });
}
