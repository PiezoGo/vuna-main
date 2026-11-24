"use client";

import type { ApprovalStatus } from "@vuna/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

export type OrderFilters = {
  status?: string;
  date?: string;
  farmer?: string;
  buyer?: string;
  q?: string;
  unscheduled?: "true";
};

export type UserFilters = { role?: string; q?: string; approval?: ApprovalStatus };

export const adminKeys = {
  all: ["admin"] as const,
  farmers: (status: ApprovalStatus) => ["admin", "farmers", status] as const,
  allFarmers: ["admin", "farmers"] as const,
  overview: ["admin", "overview"] as const,
  orders: (filters: OrderFilters) => ["admin", "orders", filters] as const,
  allOrders: ["admin", "orders"] as const,
  trips: (date?: string) => ["admin", "trips", date ?? "recent"] as const,
  allTrips: ["admin", "trips"] as const,
  trip: (id: number) => ["admin", "trip", id] as const,
  payouts: ["admin", "payouts"] as const,
  refunds: ["admin", "refunds"] as const,
  users: (filters: UserFilters) => ["admin", "users", filters] as const,
  allUsers: ["admin", "users"] as const,
};

export function useFarmers(status: ApprovalStatus) {
  return useQuery({
    queryKey: adminKeys.farmers(status),
    queryFn: () => unwrap(clientApi.GET("/api/admin/farmers/", { params: { query: { status } } })),
  });
}

export function useApproveFarmer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) =>
      unwrap(clientApi.POST("/api/admin/farmers/{uid}/approve/", { params: { path: { uid } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useRejectFarmer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, reason }: { uid: string; reason: string }) =>
      unwrap(
        clientApi.POST("/api/admin/farmers/{uid}/reject/", {
          params: { path: { uid } },
          body: { reason },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview,
    queryFn: () => unwrap(clientApi.GET("/api/admin/overview/")),
    refetchInterval: 60_000,
  });
}
