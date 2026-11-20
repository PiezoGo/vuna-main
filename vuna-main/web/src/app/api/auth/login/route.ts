import { NextResponse } from "next/server";

import { publicApi } from "@/lib/api/server";
import { setSessionCookie } from "@/lib/auth/cookie";
import { forwardClientIp, passThroughError } from "@/lib/auth/route-helpers";

/** Signs in with Django, stores the token in the httpOnly cookie, returns only the user. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { data, error, response } = await publicApi().POST("/api/login/", {
    body: body as never,
    headers: forwardClientIp(request),
  });
  if (!data || error) return passThroughError(response.status, error);

  const res = NextResponse.json({ user: data.user });
  setSessionCookie(res, data.token);
  return res;
}
