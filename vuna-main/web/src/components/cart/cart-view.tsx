"use client";

import type { QuoteLine } from "@vuna/api";
import { ShoppingBasket } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { CartLine } from "@/components/cart/cart-line";
import { CartSummary } from "@/components/cart/cart-summary";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/features/cart/store";
import { useQuote } from "@/features/checkout/queries";
import { useMounted } from "@/hooks/use-mounted";
import { ApiError } from "@/lib/api/errors";

export function groupByFarmer(lines: QuoteLine[]) {
  const groups = new Map<string, { name: string; lines: QuoteLine[] }>();
  for (const line of lines) {
    const group = groups.get(line.farmer_uid) ?? { name: line.farmer_name, lines: [] };
    group.lines.push(line);
    groups.set(line.farmer_uid, group);
  }
  return [...groups.values()];
}

export function CartView() {
  const mounted = useMounted();
  const items = useCart((s) => s.items);
  const quote = useQuote(items);

  if (!mounted || (items.length > 0 && quote.isPending)) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title="Your cart is empty"
        description="Add produce from one or more farmers, then check out once."
        action={
          <Button asChild>
            <Link href={"/market" as Route}>Browse the market</Link>
          </Button>
        }
      />
    );
  }
  if (quote.error || !quote.data) {
    return (
      <p className="text-sm text-destructive">
        {quote.error instanceof ApiError
          ? quote.error.message
          : "We couldn't price your cart. Please refresh."}
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      <div className="grid gap-5">
        {groupByFarmer(quote.data.lines).map((group) => (
          <section key={group.name} className="rounded-2xl border bg-card shadow-soft">
            <h2 className="border-b px-5 py-3 text-sm font-semibold">From {group.name}</h2>
            <ul className="divide-y">
              {group.lines.map((line) => (
                <CartLine key={line.product} line={line} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <CartSummary quote={quote.data} refreshing={quote.isFetching} />
    </div>
  );
}
