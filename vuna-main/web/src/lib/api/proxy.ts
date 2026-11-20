/**
 * Pure helpers for the /api/backend proxy (kept separate so they can be unit-tested).
 */

/** Hop-by-hop and sensitive headers that must not be forwarded in either direction. */
const STRIPPED_REQUEST_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "te",
  "trailer",
  "host",
  "cookie",
  "authorization",
  "content-length",
  "accept-encoding",
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "set-cookie",
  "content-encoding",
  "content-length",
]);

export function filterRequestHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

export function filterResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

/**
 * Build the Django URL for a proxied path. Only /api/... paths are allowed, and
 * path traversal is rejected, so the proxy can't be used to reach anything else.
 * Django needs the trailing slash (APPEND_SLASH), so it is always added.
 */
export function buildUpstreamUrl(apiUrl: string, segments: string[], search: string): URL | null {
  if (segments[0] !== "api" || segments.some((s) => s === ".." || s === "." || s.includes("\\"))) {
    return null;
  }
  const origin = apiUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  const path = segments.map(encodeURIComponent).join("/");
  return new URL(`${origin}/${path}/${search}`);
}
