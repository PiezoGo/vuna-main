import { NextResponse, type NextRequest } from "next/server";

import { guestOnly, protectedAreas, routes } from "@/config/routes";
import { SESSION_COOKIE } from "@/lib/api/session-cookie";

/**
 * Next.js 16 request proxy (formerly middleware.ts). A fast first check on the cookie only:
 * signed-out visitors are sent to /login, signed-in users skip /login and /signup.
 * Roles and token validity are checked again on the server by each area's layout
 * (requireUser), because a cookie's presence proves nothing by itself.
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

  if (signedIn && guestOnly.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = routes.home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets, images and API routes.
  matcher: ["/((?!api/|_next/static|_next/image|icon.svg|favicon.ico|robots.txt|sitemap.xml).*)"],
};
