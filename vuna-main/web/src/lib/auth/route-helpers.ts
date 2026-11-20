import "server-only";

import { NextResponse } from "next/server";

/** Return Django's error body and status unchanged, so forms can show field errors. */
export function passThroughError(status: number, error: unknown): NextResponse {
  const safeStatus = status >= 400 && status < 600 ? status : 502;
  return NextResponse.json(error ?? { error: "Request failed." }, { status: safeStatus });
}

/**
 * Pass the visitor's IP to Django so its login throttling counts each visitor,
 * not every request from this server as one client.
 */
export function forwardClientIp(request: Request): Record<string, string> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip");
  return ip ? { "X-Forwarded-For": ip } : {};
}
