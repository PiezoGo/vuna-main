"use client";

import { Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { unitLabel } from "@/features/catalog/product";
import { useFarmerSummary, usePaidOrders } from "@/features/listings/queries";
import { statusInfo } from "@/features/orders/status";
import { formatDate, formatKES } from "@/lib/format";

export function FarmerEarnings() {
  const summary = useFarmerSummary();
  const orders = usePaidOrders();
  if (summary.isPending || orders.isPending) return <Skeleton className="h-64 rounded-2xl" />;
  if (summary.error || orders.error || !summary.data || !orders.data) {
    return <p className="text-sm text-destructive">Couldn&apos;t load your earnings.</p>;
  }
  const s = summary.data;
  return (
    <div className="grid gap-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Due to you", value: s.earnings_due },
          { label: "Paid out", value: s.paid_out },
          { label: "Earned this month", value: s.earned_this_month },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border bg-card p-5 shadow-soft">
            <dt className="text-sm text-muted-foreground">{m.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{formatKES(m.value)}</dd>
          </div>
        ))}
      </dl>
      {orders.data.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No paid orders yet"
          description="When buyers pay for your produce, it shows here."
        />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card shadow-soft">
          {orders.data.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm">
              <div className="grid flex-1 gap-0.5">
                <span className="font-medium">
                  {o.product_title} × {o.quantity} {unitLabel(o.product_unit, o.quantity)}
                </span>
                <span className="text-muted-foreground">
                  {o.buyer_name} · {formatDate(o.created_at)} · {statusInfo(o.status).label}
                </span>
              </div>
              <Badge variant={o.farmer_paid ? "success" : "warning"}>
                {o.farmer_paid ? "Paid out" : "Due"}
              </Badge>
              <span className="grid w-32 text-right">
                <span className="font-semibold">{formatKES(o.farmer_earnings)}</span>
                {Number(o.payout_deduction) > 0 ? (
                  <span className="text-[12px] text-destructive">
                    − {formatKES(o.payout_deduction)} refund taken off
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-muted-foreground">
        You receive 92% of your price. Payouts go to your M-Pesa number after our driver collects
        the produce.
      </p>
    </div>
  );
}
