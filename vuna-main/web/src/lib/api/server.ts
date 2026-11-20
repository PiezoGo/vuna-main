import "server-only";

import { createVunaClient, type VunaClient } from "@vuna/api";
import { cookies } from "next/headers";

import { serverEnv } from "@/config/env";
import { SESSION_COOKIE } from "@/lib/api/session-cookie";

const TIMEOUT_MS = 15_000;

/**
 * openapi-fetch hands us a Request object. Next.js's patched fetch can drop the body of a
 * Request passed together with an init object, so we unpack it into a plain URL + init.
 */
const fetchWithTimeout: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const signals = [AbortSignal.timeout(TIMEOUT_MS), request.signal];
  if (init?.signal) signals.push(init.signal);
  return fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    signal: AbortSignal.any(signals),
  });
};

/**
 * API client for Server Components, server actions and route handlers.
 * Calls Django directly and sends the signed-in user's token from the httpOnly cookie.
 * Uses no cookies (and so stays cacheable) when `anonymous` is true, for public ISR pages.
 */
export async function serverApi(opts: { anonymous?: boolean } = {}): Promise<VunaClient> {
  const token = opts.anonymous ? undefined : (await cookies()).get(SESSION_COOKIE)?.value;
  return createVunaClient({
    baseUrl: serverEnv().API_URL,
    getToken: () => token,
    fetch: fetchWithTimeout,
  });
}

/** Public, cookie-free client for cached pages (catalogue, product pages, sitemap). */
export function publicApi(): VunaClient {
  return createVunaClient({ baseUrl: serverEnv().API_URL, fetch: fetchWithTimeout });
}
