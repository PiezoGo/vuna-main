import { ApiError, networkError, toApiError } from "@/lib/api/errors";

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/**
 * Unwrap an openapi-fetch result: return the data or throw an ApiError.
 * Usage: const products = await unwrap(api.GET("/api/products/"));
 */
export async function unwrap<T>(promise: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await promise;
  } catch (cause) {
    throw networkError(cause);
  }
  if (result.error !== undefined || !result.response.ok) {
    throw toApiError(result.response.status, result.error);
  }
  return result.data as T;
}

export { ApiError };
