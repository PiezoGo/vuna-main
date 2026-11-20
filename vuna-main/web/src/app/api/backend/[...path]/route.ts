import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/config/env";
import { buildUpstreamUrl, filterRequestHeaders, filterResponseHeaders } from "@/lib/api/proxy";
import { SESSION_COOKIE } from "@/lib/api/session-cookie";

/**
 * Authenticated proxy from the browser to Django.
 * The browser calls /api/backend/api/...; we attach the DRF token from the httpOnly
 * cookie and forward the request. The token never reaches client-side JavaScript.
 */

const TIMEOUT_MS = 30_000;

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, { params }: Context): Promise<Response> {
  const { path } = await params;
  const upstream = buildUpstreamUrl(serverEnv().API_URL, path, request.nextUrl.search);
  if (!upstream) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const headers = filterRequestHeaders(request.headers);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  // Buffer the body (JSON or multipart uploads, a few MB at most). Streaming request
  // bodies through Node's fetch is unreliable and can arrive empty upstream.
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: filterResponseHeaders(response.headers),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    console.error("[api/backend] upstream request failed", { url: upstream.pathname, error });
    return NextResponse.json(
      { error: timedOut ? "The server took too long to respond." : "Can't reach the VUNA API right now." },
      { status: timedOut ? 504 : 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
