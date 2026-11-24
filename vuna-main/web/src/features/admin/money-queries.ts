"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminKeys } from "@/features/admin/queries";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

/** Farmer payouts and buyer refunds, recorded by hand with the M-Pesa reference. */
export function usePayouts() {
  return useQuery({
    queryKey: adminKeys.payouts,
    queryFn: () => unwrap(clientApi.GET("/api/admin/payouts/")),
    refetchInterval: 60_000,
  });
}

export function useRefunds() {
  return useQuery({
    queryKey: adminKeys.refunds,
    queryFn: () => unwrap(clientApi.GET("/api/admin/refunds/")),
  });
}

export type MoneyKind = "payout" | "refund";

export function useRecordMoney(kind: MoneyKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reference }: { id: number; reference: string }) =>
      kind === "payout"
        ? unwrap(
            clientApi.POST("/api/admin/payouts/{id}/record/", {
              params: { path: { id } },
              body: { reference },
            }),
          )
        : unwrap(
            clientApi.POST("/api/admin/refunds/{id}/record/", {
              params: { path: { id } },
              body: { reference },
            }),
          ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
