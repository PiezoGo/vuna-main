"use client";

import type { RefundLine } from "@vuna/api";
import { Phone, RotateCcw } from "lucide-react";
import * as React from "react";

import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { RecordReferenceDialog } from "@/components/admin/record-reference-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useRefunds } from "@/features/admin/money-queries";
import { statusInfo } from "@/features/orders/status";
import { formatDate, formatKES } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

export function RefundQueue() {
  const { data, isPending, error } = useRefunds();
  if (isPending) return <ListSkeleton label="Loading refunds" />;
  if (error) return <QueryError error={error} fallback="Couldn't load refunds." />;
  if (data.length === 0)
    return (
      <EmptyState
        icon={RotateCcw}
        title="No refunds to send"
        description="Paid lines a farmer declines, or that expire, appear here."
      />
    );
  return (
    <ul className="grid gap-3">
      {data.map((line) => (
        <RefundRow key={line.id} line={line} />
      ))}
    </ul>
  );
}

function RefundRow({ line }: { line: RefundLine }) {
  const [open, setOpen] = React.useState(false);
  const status = statusInfo(line.status);
  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{line.buyer_name}</p>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <a
          href={`tel:+${line.buyer_phone}`}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary"
        >
          <Phone className="size-3.5" aria-hidden /> M-Pesa {formatKePhone(line.buyer_phone)}
        </a>
        <p className="text-sm text-muted-foreground">
          Order #{line.id} · {line.quantity} × {line.product_title} · ordered{" "}
          {formatDate(line.created_at)}
          {line.payment_reference ? ` · paid with ${line.payment_reference}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        <p className="text-lg font-semibold">{formatKES(line.total_price)}</p>
        <Button variant="mpesa" size="sm" onClick={() => setOpen(true)}>
          Record refund
        </Button>
      </div>
      <RecordReferenceDialog
        kind="refund"
        orderId={line.id}
        open={open}
        onOpenChange={setOpen}
        title={`Record refund to ${line.buyer_name}`}
        description={
          <>
            Send {formatKES(line.total_price)} back by M-Pesa to {formatKePhone(line.buyer_phone)},
            then enter the reference here.
          </>
        }
      />
    </li>
  );
}
