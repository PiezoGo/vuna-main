import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "@/lib/api/errors";

/**
 * Put DRF field errors on the matching inputs. Returns the message to show at the top
 * of the form for anything that isn't tied to a field.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }
  let unmatched = false;
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: "server", message: messages[0] });
    } else {
      unmatched = true;
    }
  }
  const hasFieldErrors = Object.keys(error.fieldErrors).length > 0;
  if (!hasFieldErrors || unmatched) return error.message;
  return null;
}
