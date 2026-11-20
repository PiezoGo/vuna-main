import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api/server";
import { clearSessionCookie } from "@/lib/auth/cookie";

/** Deletes the token in Django (signs out everywhere it was used) and clears the cookie. */
export async function POST() {
  try {
    const api = await serverApi();
    await api.POST("/api/logout/");
  } catch (error) {
    // The cookie is cleared regardless; a failed upstream call only leaves a stale token.
    console.error("[auth/logout] upstream logout failed", error);
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
