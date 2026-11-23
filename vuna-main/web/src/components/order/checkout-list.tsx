"use client";

import { ChevronRight, ClipboardList } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCheckouts } from "@/features/checkout/queries";
import { CHECKOUT_STATE } from "@/features/orders/status";
import { ApiError } from "@/lib/api/errors";
import { formatDate, formatKES } from "@/lib/format";

export function CheckoutList() {
  const { data, isPending, error } = useCheckouts();
  if (isPending) return <Skeleton className="h-40 rounded-2xl" />;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Couldn't load your orders."}
      </p>
    );
  if (data.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No orders yet"
        action={
          <Button asChild>
            <Link href={"/market" as Route}>Browse the market</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="grid gap-3">
      {data.map((c) => {
        const state = CHECKOUT_STATE[c.state] ?? CHECKOUT_STATE.closed!;
        return (
          <li key={c.id}>
            <Link
              href={`/orders/${c.id}` as Route}
              className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-shadow outline-none hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <div className="grid flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">Order #{c.id}</p>
                  <Badge variant={state.variant}>{state.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {c.lines.length} item{c.lines.length === 1 ? "" : "s"} · deliver{" "}
                  {formatDate(c.delivery_date)} to {c.area}
                </p>
              </div>
              <p className="font-semibold">{formatKES(c.total)}</p>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
