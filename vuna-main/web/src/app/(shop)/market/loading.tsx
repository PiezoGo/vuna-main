import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketLoading() {
  return (
    <section
      className="container-page grid gap-8 py-8 sm:py-10"
      role="status"
      aria-label="Loading the market"
    >
      <div className="grid gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </div>
      <Skeleton className="h-12" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      <ProductGridSkeleton />
    </section>
  );
}
