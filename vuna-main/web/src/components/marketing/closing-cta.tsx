import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function ClosingCta() {
  return (
    <section className="container-page pb-16 sm:pb-24">
      <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to trade direct?</h2>
        <p className="mx-auto mt-3 max-w-lg text-primary-foreground/85">
          Join the farmers and businesses cutting out the middleman.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" asChild>
            <Link href={"/signup" as Route}>Create a free account</Link>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            asChild
            className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
          >
            <Link href={"/market" as Route}>Browse the market</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
