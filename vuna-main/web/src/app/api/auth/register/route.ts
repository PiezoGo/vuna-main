import { NextResponse } from "next/server";

import { publicApi } from "@/lib/api/server";
import { setSessionCookie } from "@/lib/auth/cookie";
import { forwardClientIp, passThroughError } from "@/lib/auth/route-helpers";

/** Creates a farmer or buyer account in Django and signs them in. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const { data, error, response } = await publicApi().POST("/api/register/", {
    body: body as never,
    headers: forwardClientIp(request),
  });
  if (!data || error) return passThroughError(response.status, error);

  const res = NextResponse.json({ user: data.user }, { status: 201 });
  setSessionCookie(res, data.token);
  return res;
}
