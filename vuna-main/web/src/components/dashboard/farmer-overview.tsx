"use client";

import { ClipboardList, Package, Plus, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarmerSummary } from "@/features/listings/queries";
import { formatKES } from "@/lib/format";

export function FarmerOverview() {
  const { data, isPending, error } = useFarmerSummary();
  if (isPending) return <Skeleton className="h-40 rounded-2xl" />;
  if (error || !data)
    return <p className="text-sm text-destructive">Couldn&apos;t load your summary.</p>;

  const cards = [
    {
      icon: ClipboardList,
      label: "Orders waiting for you",
      value: String(data.waiting_orders),
      href: "/farmer/orders",
      highlight: data.waiting_orders > 0,
    },
    {
      icon: Package,
      label: "Live listings",
      value: String(data.live_listings),
      href: "/farmer/listings",
      note: data.paused_listings ? `${data.paused_listings} paused` : undefined,
    },
    {
      icon: Wallet,
      label: "Earnings due to you",
      value: formatKES(data.earnings_due),
      href: "/farmer/earnings",
    },
    {
      icon: Wallet,
      label: "Paid out to you",
      value: formatKES(data.paid_out),
      href: "/farmer/earnings",
      note: `${formatKES(data.earned_this_month)} earned this month`,
    },
  ];

  return (
    <div className="grid gap-6">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, href, highlight, note }) => (
          <li key={label}>
            <Link
              href={href as Route}
              className={`grid gap-2 rounded-2xl border bg-card p-5 shadow-soft transition-shadow outline-none hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50 ${highlight ? "border-warning/40 bg-warning-soft" : ""}`}
            >
              <Icon className="size-5 text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
              {note ? <p className="text-[12px] text-muted-foreground">{note}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
      <div>
        <Button asChild>
          <Link href={"/farmer/listings/new" as Route}>
            <Plus /> Add a listing
          </Link>
        </Button>
      </div>
    </div>
  );
}
