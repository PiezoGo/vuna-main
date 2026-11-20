import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page grid gap-6 py-16" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
