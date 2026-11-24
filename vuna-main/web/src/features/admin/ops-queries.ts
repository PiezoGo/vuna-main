"use client";

import type { OrderStep } from "@vuna/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminKeys, type OrderFilters } from "@/features/admin/queries";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

/** Orders, manual fulfilment steps and delivery trips. */
export function useAdminOrders(filters: OrderFilters, enabled = true) {
  return useQuery({
    queryKey: adminKeys.orders(filters),
    queryFn: () => unwrap(clientApi.GET("/api/admin/orders/", { params: { query: filters } })),
    enabled,
  });
}

export function useOrderStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStep }) =>
      unwrap(
        clientApi.POST("/api/admin/orders/{id}/step/", {
          params: { path: { id } },
          body: { status },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useTrips(date?: string) {
  return useQuery({
    queryKey: adminKeys.trips(date),
    queryFn: () =>
      unwrap(clientApi.GET("/api/admin/trips/", { params: { query: date ? { date } : {} } })),
  });
}

export function useTrip(id: number) {
  return useQuery({
    queryKey: adminKeys.trip(id),
    queryFn: () => unwrap(clientApi.GET("/api/admin/trips/{id}/", { params: { path: { id } } })),
  });
}

export type NewTrip = { delivery_date: string; driver: string; orders: number[]; notes?: string };

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NewTrip) => unwrap(clientApi.POST("/api/admin/trips/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useSetTripOrders(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orders: number[]) =>
      unwrap(
        clientApi.PUT("/api/admin/trips/{id}/orders/", {
          params: { path: { id } },
          body: { orders },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useCancelTrip(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap(clientApi.POST("/api/admin/trips/{id}/cancel/", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
