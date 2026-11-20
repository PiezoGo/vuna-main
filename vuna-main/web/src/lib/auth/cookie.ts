import "server-only";

import type { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/api/session-cookie";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** The DRF token lives only in this httpOnly cookie; page JavaScript can never read it. */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
