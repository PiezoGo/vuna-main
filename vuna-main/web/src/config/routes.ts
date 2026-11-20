import type { Route } from "next";

import type { Role } from "@/types/auth";

/**
 * Public and auth routes used across the app. One copy only.
 * Typed as Route so <Link> accepts them even before later modules create the pages.
 */
export const routes = {
  home: "/",
  market: "/market",
  login: "/login",
  signup: "/signup",
  about: "/about",
  terms: "/terms",
  team: "/team",
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
};
