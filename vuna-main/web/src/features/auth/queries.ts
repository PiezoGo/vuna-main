"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { routes } from "@/config/routes";
import { authClient } from "@/lib/api/auth-client";

export const authKeys = {
  session: ["auth", "session"] as const,
};

/** The signed-in user for client components (e.g. the public header). */
export function useSession() {
  return useQuery({
    queryKey: authKeys.session,
    queryFn: async () => (await authClient.session()).user,
    staleTime: 60_000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authClient.logout,
    onSettled: () => {
      queryClient.clear();
      router.replace(routes.login as Route);
      router.refresh();
    },
  });
}
