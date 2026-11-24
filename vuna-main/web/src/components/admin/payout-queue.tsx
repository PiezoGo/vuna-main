"use client";

import type { PayoutLine } from "@vuna/api";
import { HandCoins, Phone } from "lucide-react";
import * as React from "react";

import { PayoutCountdown } from "@/components/admin/payout-countdown";
import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { RecordReferenceDialog } from "@/components/admin/record-reference-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePayouts } from "@/features/admin/money-queries";
import { formatDateTime, formatKES } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

export function PayoutQueue() {
  const { data, isPending, error } = usePayouts();
  if (isPending) return <ListSkeleton label="Loading payouts" />;
  if (error) return <QueryError error={error} fallback="Couldn't load payouts." />;
  if (data.length === 0)
    return (
      <EmptyState
        icon={HandCoins}
        title="No payouts due"
        description="Lines appear here as soon as the driver collects the produce."
      />
    );
  return (
    <ul className="grid gap-3">
      {data.map((line) => (
        <PayoutRow key={line.id} line={line} />
      ))}
    </ul>
  );
}

function PayoutRow({ line }: { line: PayoutLine }) {
  const [open, setOpen] = React.useState(false);
  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{line.farmer_name}</p>
          <PayoutCountdown dueBy={line.due_by} />
          {line.on_hold ? <Badge variant="warning">On hold: buyer reported a problem</Badge> : null}
        </div>
        <a
          href={`tel:+${line.farmer_phone}`}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary"
        >
          <Phone className="size-3.5" aria-hidden /> M-Pesa {formatKePhone(line.farmer_phone)}
        </a>
        <p className="text-sm text-muted-foreground">
          Order #{line.id} · {line.quantity} {line.unit} {line.product_title} · collected{" "}
          {formatDateTime(line.collected_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        <div className="grid text-right">
          <p className="text-lg font-semibold">{formatKES(line.amount_to_send)}</p>
          {Number(line.deduction) > 0 ? (
            <p className="text-[12px] text-muted-foreground">
              {formatKES(line.farmer_earnings)} less {formatKES(line.deduction)} refunds
            </p>
          ) : null}
        </div>
        <Button variant="mpesa" size="sm" onClick={() => setOpen(true)}>
          Record payout
        </Button>
      </div>
      <RecordReferenceDialog
        kind="payout"
        orderId={line.id}
        open={open}
        onOpenChange={setOpen}
        title={`Record payout to ${line.farmer_name}`}
        description={
          <>
            Send {formatKES(line.amount_to_send)} by M-Pesa to {formatKePhone(line.farmer_phone)},
            then enter the reference here.
          </>
        }
      />
    </li>
  );
}
