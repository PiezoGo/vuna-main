"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLiveStore } from "@/features/realtime/store";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

export const notificationKeys = {
  all: ["notifications"] as const,
  summary: ["notifications", "summary"] as const,
  list: ["notifications", "list"] as const,
};

/**
 * Badge counts for the sidebar and the bell. With the live connection up, events refresh it
 * instantly (and a 5-minute check is a safety net); without it, it checks every 60 seconds.
 */
export function useNotificationSummary(enabled: boolean) {
  const connected = useLiveStore((s) => s.connected);
  return useQuery({
    queryKey: notificationKeys.summary,
    queryFn: () => unwrap(clientApi.GET("/api/notifications/summary/")),
    enabled,
    refetchInterval: connected ? 300_000 : 60_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => unwrap(clientApi.GET("/api/notifications/")),
    enabled,
  });
}

/** Mark the given bell items read, or all of them without ids. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) =>
      unwrap(clientApi.POST("/api/notifications/read/", { body: ids ? { ids } : {} })),
    onSuccess: (summary) => {
      queryClient.setQueryData(notificationKeys.summary, summary);
      return queryClient.invalidateQueries({ queryKey: notificationKeys.list });
    },
  });
}
