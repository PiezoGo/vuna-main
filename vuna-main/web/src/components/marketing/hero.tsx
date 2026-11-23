import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-[radial-gradient(ellipse_at_top,var(--color-primary-soft),transparent_65%)]">
      <div className="container-page py-16 sm:py-24">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">
            Farm to business, direct
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-balance sm:text-6xl">
            Harvest more. Waste less. <span className="text-primary">Earn more.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            VUNA connects Kenyan farmers with hotels, shops and wholesalers. Farmers set the price,
            we deliver, and everyone sees where the money goes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={"/market" as Route}>
                Browse the market <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={"/signup" as Route}>Sell your harvest</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
