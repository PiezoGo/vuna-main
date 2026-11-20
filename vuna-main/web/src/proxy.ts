import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 request proxy (formerly middleware.ts).
 * Pass-through for now; Module 2 adds sign-in redirects and role guards here.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Skip static assets, images and the API proxy.
  matcher: ["/((?!api/|_next/static|_next/image|icon.svg|favicon.ico|robots.txt|sitemap.xml).*)"],
};
