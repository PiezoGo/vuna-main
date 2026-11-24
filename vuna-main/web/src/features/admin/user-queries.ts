"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminKeys, type UserFilters } from "@/features/admin/queries";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

/** Users, drivers, field agents and their accounts. */
export function useAdminUsers(filters: UserFilters) {
  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: () => unwrap(clientApi.GET("/api/admin/users/", { params: { query: filters } })),
  });
}

export type NewStaff = {
  role: "driver" | "agent";
  full_name: string;
  phone_number: string;
  email?: string;
  vehicle_type?: string;
};

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NewStaff) => unwrap(clientApi.POST("/api/admin/staff/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.allUsers }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (uid: string) =>
      unwrap(
        clientApi.POST("/api/admin/users/{uid}/reset-password/", { params: { path: { uid } } }),
      ),
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, active }: { uid: string; active: boolean }) =>
      unwrap(
        clientApi.POST("/api/admin/users/{uid}/active/", {
          params: { path: { uid } },
          body: { active },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useLinkAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, agent }: { uid: string; agent: string | null }) =>
      unwrap(
        clientApi.POST("/api/admin/farmers/{uid}/agent/", {
          params: { path: { uid } },
          body: { agent },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.allUsers }),
  });
}
