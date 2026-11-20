import type { User } from "@vuna/api";

import { networkError, toApiError } from "@/lib/api/errors";

/**
 * Browser calls to our own /api/auth/* route handlers. They set or clear the httpOnly
 * session cookie; the token itself never reaches this code.
 */
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch (cause) {
    throw networkError(cause);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}

export const authClient = {
  login: (values: { email: string; password: string }) =>
    call<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify(values) }),
  register: (values: Record<string, unknown>) =>
    call<{ user: User }>("/api/auth/register", { method: "POST", body: JSON.stringify(values) }),
  logout: () => call<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  session: () => call<{ user: User | null }>("/api/auth/session"),
};
