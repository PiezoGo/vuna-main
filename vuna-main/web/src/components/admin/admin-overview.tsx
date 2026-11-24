"use client";

import {
  Clock,
  HandCoins,
  PackageCheck,
  RotateCcw,
  Timer,
  TrendingUp,
  TriangleAlert,
  Truck,
  UserCheck,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOverview } from "@/features/admin/queries";
import { formatKES } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "warning" | "danger" | undefined;

export function AdminOverview() {
  const { data, isPending, error } = useAdminOverview();
  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading overview">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error || !data)
    return <p className="text-sm text-destructive">Couldn&apos;t load today&apos;s overview.</p>;

  const cards: {
    icon: typeof Clock;
    label: string;
    value: string;
    href: string;
    tone?: Tone;
    note?: string;
  }[] = [
    {
      icon: Truck,
      label: "Paid orders without a trip",
      value: String(data.paid_without_trip),
      href: "/admin/trips/new",
      tone: data.paid_without_trip > 0 ? "warning" : undefined,
    },
    {
      icon: HandCoins,
      label: "Farmer payouts due",
      value: String(data.payouts_due),
      href: "/admin/payouts",
      tone: data.payouts_overdue > 0 ? "danger" : data.payouts_due > 0 ? "warning" : undefined,
      note:
        data.payouts_overdue > 0
          ? `${data.payouts_overdue} past the 4-hour promise`
          : "Within 4 hours of collection",
    },
    {
      icon: RotateCcw,
      label: "Refunds to send",
      value: String(data.refunds_to_send),
      href: "/admin/refunds",
      tone: data.refunds_to_send > 0 ? "warning" : undefined,
    },
    { icon: Truck, label: "Trips today", value: String(data.trips_today), href: "/admin/trips" },
    {
      icon: TriangleAlert,
      label: "Problems reported",
      value: String(data.problems_open),
      href: "/admin/problems",
      tone: data.problems_open > 0 ? "danger" : undefined,
    },
    {
      icon: PackageCheck,
      label: "Delivered, not confirmed for 24 h+",
      value: String(data.unconfirmed_over_24h),
      href: "/admin/orders?status=delivered",
      tone: data.unconfirmed_over_24h > 0 ? "warning" : undefined,
      note: "Call the buyer to confirm",
    },
    {
      icon: Clock,
      label: "Waiting for farmers",
      value: String(data.waiting_for_farmers),
      href: "/admin/orders?status=pending",
      note: "Farmers have 2 hours to answer",
    },
    {
      icon: Timer,
      label: "Accepted, not yet paid",
      value: String(data.awaiting_payment),
      href: "/admin/orders?status=accepted",
      note: "Buyers have 30 minutes to pay",
    },
    {
      icon: UserCheck,
      label: "Farmers to approve",
      value: String(data.pending_farmers),
      href: "/admin/farmers",
      tone: data.pending_farmers > 0 ? "warning" : undefined,
    },
    {
      icon: TrendingUp,
      label: "Sales this week",
      value: formatKES(data.week_gmv, { whole: true }),
      href: "/admin/orders",
      note: `${data.week_orders} paid order line${data.week_orders === 1 ? "" : "s"}`,
    },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ icon: Icon, label, value, href, tone, note }) => (
        <li key={label}>
          <Link
            href={href as Route}
            className={cn(
              "grid h-full gap-2 rounded-2xl border bg-card p-5 shadow-soft transition-shadow outline-none hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50",
              tone === "warning" && "border-warning/40 bg-warning-soft",
              tone === "danger" && "border-destructive/40 bg-destructive-soft",
            )}
          >
            <Icon
              className={cn("size-5 text-primary", tone === "danger" && "text-destructive")}
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {note ? <p className="text-[12px] text-muted-foreground">{note}</p> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
