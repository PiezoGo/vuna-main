import createClient, { type Client, type Middleware } from "openapi-fetch";

import type { paths } from "./schema";

export type VunaClient = Client<paths>;

export type CreateVunaClientOptions = {
  /** API base URL including /api, e.g. "https://vuna-main.onrender.com/api" or "/api/backend". */
  baseUrl: string;
  /** Returns the DRF token, if any. Web server code reads the cookie; Expo reads SecureStore. */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
};

/**
 * Typed client for the VUNA Django API. Framework-free so web and the Expo app share it.
 * Paths match the OpenAPI schema, including the /api prefix: client.GET("/api/products/").
 */
export function createVunaClient({
  baseUrl,
  getToken,
  fetch,
  headers,
}: CreateVunaClientOptions): VunaClient {
  // The schema's paths start with /api/...; strip it from the base so both line up.
  const normalizedBase = baseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  const client = createClient<paths>({ baseUrl: normalizedBase, fetch, headers });

  if (getToken) {
    const auth: Middleware = {
      async onRequest({ request }) {
        const token = await getToken();
        if (token) {
          request.headers.set("Authorization", `Token ${token}`);
        }
        return request;
      },
    };
    client.use(auth);
  }

  return client;
}
