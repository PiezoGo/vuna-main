"use client";

import type { ApprovalStatus } from "@vuna/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

export const adminKeys = {
  farmers: (status: ApprovalStatus) => ["admin", "farmers", status] as const,
  allFarmers: ["admin", "farmers"] as const,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.allFarmers }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.allFarmers }),
  });
}
