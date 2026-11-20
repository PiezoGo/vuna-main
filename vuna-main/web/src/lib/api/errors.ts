/** Field errors as DRF returns them: { field: ["message", ...] }. */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** First message for one field, for form inputs. */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0];
  }
}

const GENERIC: Record<number, string> = {
  400: "Please check the highlighted fields.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  429: "Too many requests. Please wait a moment and try again.",
};

/**
 * Turn any DRF error body into an ApiError. DRF uses several shapes:
 * {"error": "..."}, {"detail": "..."}, {"field": ["..."]}, {"non_field_errors": ["..."]}.
 */
export function toApiError(status: number, body: unknown): ApiError {
  const fallback =
    GENERIC[status] ??
    (status >= 500 ? "Something went wrong on our side. Please try again." : "Request failed.");

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return new ApiError(
      status,
      typeof body === "string" && body.length < 300 && body ? body : fallback,
    );
  }

  const record = body as Record<string, unknown>;
  const fieldErrors: FieldErrors = {};
  let message: string | undefined;

  for (const [key, value] of Object.entries(record)) {
    const messages = Array.isArray(value)
      ? value.map(String)
      : typeof value === "string"
        ? [value]
        : [];
    if (messages.length === 0) continue;
    if (key === "error" || key === "detail" || key === "non_field_errors") {
      message ??= messages[0];
    } else {
      fieldErrors[key] = messages;
    }
  }

  return new ApiError(status, message ?? fallback, fieldErrors);
}

/** Network failure or timeout before any response arrived. */
export function networkError(cause: unknown): ApiError {
  const timedOut =
    cause instanceof DOMException && (cause.name === "TimeoutError" || cause.name === "AbortError");
  return new ApiError(
    0,
    timedOut
      ? "The server took too long to respond. Please try again."
      : "Can't reach VUNA right now. Check your connection.",
  );
}
