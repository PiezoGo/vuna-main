import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import { getLatestProducts } from "@/lib/api/endpoints/catalog";

/** The newest listings. Renders nothing if there are none or the API is unreachable. */
export async function FreshListings() {
  let products;
  try {
    products = (await getLatestProducts(8)).results;
  } catch (error) {
    console.error("[home] could not load fresh listings", error);
    return null;
  }
  if (products.length === 0) return null;

  return (
    <section className="container-page py-14 sm:py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">
            On the market now
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold">Fresh listings</h2>
        </div>
        <Button variant="ghost" asChild className="hidden sm:inline-flex">
          <Link href={"/market" as Route}>
            See everything <ArrowRight />
          </Link>
        </Button>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
