import type { Quote } from "@vuna/api";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/format";

export function CartSummary({ quote, refreshing }: { quote: Quote; refreshing?: boolean }) {
  return (
    <aside
      className="grid gap-4 rounded-2xl border bg-card p-5 shadow-soft lg:sticky lg:top-24"
      aria-busy={refreshing}
    >
      <h2 className="font-semibold">Summary</h2>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Items</dt>
          <dd>{quote.lines.length}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd>Included</dd>
        </div>
        <div className="flex justify-between border-t pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatKES(quote.total)}</dd>
        </div>
      </dl>
      {quote.ok ? (
        <Button size="lg" asChild>
          <Link href={"/checkout" as Route}>Check out</Link>
        </Button>
      ) : (
        <>
          <Button size="lg" disabled>
            Check out
          </Button>
          <p className="text-[13px] text-destructive">Fix the highlighted items first.</p>
        </>
      )}
      <p className="text-[12px] text-muted-foreground">
        You only pay for items farmers can supply. Declined items are refunded.
      </p>
    </aside>
  );
}
