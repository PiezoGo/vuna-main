"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminKeys } from "@/features/admin/queries";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

export type ProblemFilter = "open" | "refunded" | "rejected" | "all";

export type ProblemDecision = {
  decision: "refund" | "reject";
  fault?: "farmer" | "vuna";
  amount?: string | null;
  note: string;
};

/** Buyer problem reports after delivery, decided by an admin. */
export function useProblems(status: ProblemFilter) {
  return useQuery({
    queryKey: [...adminKeys.all, "problems", status] as const,
    queryFn: () => unwrap(clientApi.GET("/api/admin/problems/", { params: { query: { status } } })),
  });
}

export function useDecideProblem(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProblemDecision) =>
      unwrap(
        clientApi.POST("/api/admin/problems/{id}/decide/", { params: { path: { id } }, body }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
