import { NextResponse, type NextRequest } from "next/server";

import { routes, safeNext } from "@/config/routes";
import { clearSessionCookie } from "@/lib/auth/cookie";

/** Removes a session cookie whose token is no longer valid, then goes to sign-in. */
export function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const url = request.nextUrl.clone();
  url.pathname = routes.login;
  url.search = next ? `?next=${encodeURIComponent(next)}` : "";
  const response = NextResponse.redirect(url);
  clearSessionCookie(response);
  return response;
}
