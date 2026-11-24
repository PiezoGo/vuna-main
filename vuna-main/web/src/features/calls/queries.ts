"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

export const callKeys = {
  check: (uid: string) => ["calls", "check", uid] as const,
};

/** Whether to show a call button for this person (calls set up, and allowed). */
export function useCallCheck(uid: string | null | undefined) {
  return useQuery({
    queryKey: callKeys.check(uid ?? ""),
    queryFn: () =>
      unwrap(clientApi.GET("/api/calls/check/{uid}/", { params: { path: { uid: uid ?? "" } } })),
    enabled: Boolean(uid),
    staleTime: 60_000,
  });
}

export function useStartCall() {
  return useMutation({
    mutationFn: (body: { callee: string; kind: "audio" | "video"; order?: number | null }) =>
      unwrap(clientApi.POST("/api/calls/", { body })),
  });
}

export function useAcceptCall() {
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(clientApi.POST("/api/calls/{id}/accept/", { params: { path: { id } } })),
  });
}

export function useHangUp() {
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(clientApi.POST("/api/calls/{id}/hang-up/", { params: { path: { id } } })),
  });
}
