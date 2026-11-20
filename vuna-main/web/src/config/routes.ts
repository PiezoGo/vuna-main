import type { Route } from "next";

import type { Role } from "@/types/auth";

/**
 * Public and auth routes used across the app. One copy only.
 * Typed as Route so <Link> accepts them even before later modules create the pages.
 */
export const routes = {
  root: "/",
  market: "/market",
  login: "/login",
  signup: "/signup",
  about: "/about",
  terms: "/terms",
  team: "/team",
  home: "/home",
  profile: "/profile",
  changePassword: "/change-password",
} as const satisfies Record<string, string>;

export type AppRoute = (typeof routes)[keyof typeof routes];

/** Use with <Link href={route(routes.market)} /> for pages built in later modules. */
export const route = (path: AppRoute | string): Route => path as Route;

/** Where each role lands after signing in. */
export const roleHome: Record<Role, string> = {
  buyer: "/market",
  farmer: "/farmer",
  driver: "/driver",
  admin: "/admin",
  agent: "/agent",
};

/** Path prefixes that need a signed-in user, and which roles may open them (undefined = any role). */
export const protectedAreas: { prefix: string; roles?: Role[] }[] = [
  { prefix: "/farmer", roles: ["farmer"] },
  { prefix: "/driver", roles: ["driver"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/agent", roles: ["agent"] },
  { prefix: "/profile" },
  { prefix: "/change-password" },
  { prefix: "/home" },
  { prefix: "/cart" },
  { prefix: "/checkout" },
  { prefix: "/orders" },
  { prefix: "/messages" },
  { prefix: "/farmers" },
];

/** Pages for signed-out visitors only. */
export const guestOnly = ["/login", "/signup"];

/** Only same-site relative paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return null;
  return next;
}
