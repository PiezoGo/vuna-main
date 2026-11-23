import { NextResponse, type NextRequest } from "next/server";

import { protectedAreas, routes } from "@/config/routes";
import { SESSION_COOKIE } from "@/lib/api/session-cookie";

/**
 * Next.js 16 request proxy (formerly middleware.ts). A fast first check on the cookie only:
 * visitors without a session cookie are sent to /login. It never redirects *because* a
 * cookie exists: the cookie may be stale (token deleted, database reset), and treating it
 * as proof caused a /login ⇄ /home loop. Token validity and roles are checked on the server
 * by requireUser in every private page.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = protectedAreas.some(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = routes.login;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets, images and API routes.
  matcher: ["/((?!api/|_next/static|_next/image|icon.svg|favicon.ico|robots.txt|sitemap.xml).*)"],
};
