import { networkError, toApiError } from "@/lib/api/errors";

/**
 * Multipart requests (photo uploads) to Django through our /api/backend proxy.
 * openapi-fetch is JSON-first, so file uploads use this one helper instead.
 */
export async function sendForm<T>(
  method: "POST" | "PATCH",
  path: `/api/${string}`,
  form: FormData,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, {
      method,
      body: form,
      headers: { Accept: "application/json" },
    });
  } catch (cause) {
    throw networkError(cause);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}
