import { ArrowRight, Sprout, Store, Truck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { FadeIn } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { route, routes } from "@/config/routes";
import { publicApi } from "@/lib/api/server";
import { unwrap } from "@/lib/api/result";

// Temporary home page for Module 1. The real landing page arrives in Module 3.
export const revalidate = 60;

const pillars = [
  {
    icon: Sprout,
    title: "Farmers list produce",
    text: "Set your farm-gate price. We handle the rest.",
  },
  {
    icon: Store,
    title: "Buyers order in bulk",
    text: "Hotels, retailers and wholesalers buy direct.",
  },
  { icon: Truck, title: "We deliver", text: "Vetted drivers move orders from farm to door." },
];

export default function HomePage() {
  return (
    <section className="container-page py-16 sm:py-24">
      <FadeIn className="mx-auto max-w-3xl text-center">
        <Suspense fallback={<Skeleton className="mx-auto h-7 w-56 rounded-full" />}>
          <LiveListings />
        </Suspense>
        <h1 className="mt-6 font-display text-4xl font-semibold sm:text-6xl">
          Fresh produce, <span className="text-primary">straight from the farm</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          VUNA connects Kenyan farmers directly with the businesses that feed the country.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href={route(routes.signup)}>
              Get started <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={route(routes.login)}>Sign in</Link>
          </Button>
        </div>
      </FadeIn>

      <div className="mx-auto mt-20 grid max-w-5xl gap-4 sm:grid-cols-3">
        {pillars.map((pillar, index) => (
          <FadeIn
            key={pillar.title}
            delay={0.08 * index}
            className="rounded-2xl border bg-card p-6 shadow-soft"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <pillar.icon className="size-5" aria-hidden />
            </div>
            <h2 className="mt-4 font-semibold">{pillar.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{pillar.text}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

async function getListingCount(): Promise<number | null> {
  try {
    const data = await unwrap(
      publicApi().GET("/api/products/", { params: { query: { page_size: 1 } } }),
    );
    return data.count;
  } catch (error) {
    console.error("[home] could not load listing count", error);
    return null;
  }
}

/** Proves the server → Django path end to end. */
async function LiveListings() {
  const count = await getListingCount();
  if (count === null) {
    return (
      <Badge variant="muted" className="px-3 py-1 text-[13px]">
        Farm-to-business marketplace
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="px-3 py-1 text-[13px]">
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      {count} fresh listings on the market today
    </Badge>
  );
}
