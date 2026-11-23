import { SearchX, Store } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { MarketFilters } from "@/components/catalog/market-filters";
import { MarketPagination } from "@/components/catalog/pagination";
import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { hasFilters, marketHref, parseMarketSearch } from "@/features/catalog/search-params";
import { getFacets, getMarketProducts } from "@/lib/api/endpoints/catalog";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const search = parseMarketSearch(await searchParams);
  const subject = search.commodity ? `${search.commodity} ` : "";
  const place = search.city ? ` in ${search.city}` : "";
  return {
    title: `Buy fresh ${subject}produce${place} direct from farmers`,
    description:
      "Fresh produce from Kenyan farms, sold direct to hotels, retailers and wholesalers. Published prices with delivery included.",
    // One canonical URL per filter combination, never per page or sort.
    alternates: {
      canonical: marketHref({
        commodity: search.commodity,
        city: search.city,
        market: search.market,
      }),
    },
    robots: search.q || search.page > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function MarketPage({ searchParams }: Props) {
  const search = parseMarketSearch(await searchParams);
  const [products, facets] = await Promise.all([getMarketProducts(search), getFacets()]);
  const filtered = hasFilters(search);

  return (
    <section className="container-page grid gap-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Market"
        title="Fresh from Kenyan farms"
        description="Farmers set their own prices. What you see includes delivery. No middlemen."
      />
      <MarketFilters search={search} facets={facets} />

      <div className="grid gap-6">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {products.count === 0
            ? "No listings match."
            : `${products.count.toLocaleString("en-KE")} listing${products.count === 1 ? "" : "s"}`}
        </p>
        {products.results.length > 0 ? (
          <ProductGrid products={products.results} />
        ) : filtered ? (
          <EmptyState
            icon={SearchX}
            title="Nothing matches those filters"
            description="Try another area or produce, or clear the filters."
            action={
              <Button variant="outline" asChild>
                <Link href={"/market" as Route}>Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Store}
            title="No produce listed yet"
            description="Farmers are joining VUNA now. Check back soon, or sign up to sell."
            action={
              <Button asChild>
                <Link href={"/signup" as Route}>Sell on VUNA</Link>
              </Button>
            }
          />
        )}
        <MarketPagination search={search} total={products.count} />
      </div>
    </section>
  );
}
