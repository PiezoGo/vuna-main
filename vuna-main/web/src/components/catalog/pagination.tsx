import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PAGE_SIZE, marketHref, type MarketSearch } from "@/features/catalog/search-params";

export function MarketPagination({ search, total }: { search: MarketSearch; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const page = Math.min(search.page, pages);
  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3">
      {page > 1 ? (
        <Button variant="outline" asChild>
          <Link href={marketHref({ ...search, page: page - 1 }) as Route} rel="prev">
            <ChevronLeft /> Previous
          </Link>
        </Button>
      ) : null}
      <span className="text-sm text-muted-foreground">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Button variant="outline" asChild>
          <Link href={marketHref({ ...search, page: page + 1 }) as Route} rel="next">
            Next <ChevronRight />
          </Link>
        </Button>
      ) : null}
    </nav>
  );
}
