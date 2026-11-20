import "server-only";

import type { User } from "@vuna/api";
import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { roleHome, routes } from "@/config/routes";
import { serverApi } from "@/lib/api/server";
import { SESSION_COOKIE } from "@/lib/api/session-cookie";
import { isRole, type Role } from "@/types/auth";

/**
 * The signed-in user, loaded once per request. Returns null when signed out or when
 * the token is no longer valid (the API answers 401).
 */
export const getSession = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const api = await serverApi();
  const { data, response } = await api.GET("/api/profile/");
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok || !data) {
    throw new Error(`Could not load the session (HTTP ${response.status}).`);
  }
  return data;
});

type RequireOptions = {
  roles?: Role[];
  /** The change-password page itself must stay reachable while a change is required. */
  allowPendingPasswordChange?: boolean;
};

/**
 * For Server Components and layouts of private pages: returns the user or redirects.
 * Signed out → /login?next=… · must change password → /change-password · wrong role → own home.
 */
export async function requireUser(
  currentPath: string,
  options: RequireOptions = {},
): Promise<User> {
  const user = await getSession();
  if (!user) {
    redirect(`${routes.login}?next=${encodeURIComponent(currentPath)}` as Route);
  }
  if (user.must_change_password && !options.allowPendingPasswordChange) {
    redirect(routes.changePassword as Route);
  }
  if (options.roles && (!isRole(user.role) || !options.roles.includes(user.role))) {
    redirect(homeFor(user));
  }
  return user;
}

export function homeFor(user: Pick<User, "role">): Route {
  return (isRole(user.role) ? roleHome[user.role] : routes.root) as Route;
}
