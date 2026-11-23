import { Suspense } from "react";

import { ClosingCta } from "@/components/marketing/closing-cta";
import { FreshListings } from "@/components/marketing/fresh-listings";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Promises } from "@/components/marketing/promises";
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";

// Static page, refreshed at most once a minute so fresh listings stay current.
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Promises />
      <HowItWorks />
      <Suspense
        fallback={
          <div className="container-page py-14">
            <ProductGridSkeleton count={4} />
          </div>
        }
      >
        <FreshListings />
      </Suspense>
      <ClosingCta />
    </>
  );
}
