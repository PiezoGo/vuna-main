import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";

/** Skeleton rows while a list loads. */
export function ListSkeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className="grid gap-3" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export function QueryError({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {error instanceof ApiError ? error.message : fallback}
    </p>
  );
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Try again.") {
  if (!(error instanceof ApiError)) return fallback;
  const firstField = Object.values(error.fieldErrors)[0]?.[0];
  return firstField ?? error.message;
}
