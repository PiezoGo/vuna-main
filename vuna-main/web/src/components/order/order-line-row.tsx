"use client";

import type { Order } from "@vuna/api";
import { toast } from "sonner";

import { DeliveryActions } from "@/components/order/delivery-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { unitLabel } from "@/features/catalog/product";
import { useCancelLine } from "@/features/checkout/queries";
import { statusInfo } from "@/features/orders/status";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime, formatKES } from "@/lib/format";

export function OrderLineRow({ line, checkoutId }: { line: Order; checkoutId: number }) {
  const cancel = useCancelLine(checkoutId);
  const status = statusInfo(line.status);
  const canCancel = (line.status === "pending" || line.status === "accepted") && !line.is_paid;

  return (
    <li className="grid gap-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-1">
          <p className="font-semibold">
            {line.product_title} × {line.quantity} {unitLabel(line.product_unit, line.quantity)}
          </p>
          <p className="text-sm text-muted-foreground">From {line.farmer_name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {line.is_paid && !line.refunded ? <Badge variant="success">Paid</Badge> : null}
            {line.refunded ? <Badge variant="muted">Refunded</Badge> : null}
            {line.answer_deadline ? (
              <span className="text-[12px] text-muted-foreground">
                Farmer answers by {formatDateTime(line.answer_deadline)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p
            className={
              line.status === "declined" || line.status === "expired" || line.status === "cancelled"
                ? "text-muted-foreground line-through"
                : "font-semibold"
            }
          >
            {formatKES(line.total_price)}
          </p>
          {canCancel ? (
            <Button
              variant="ghost"
              size="sm"
              loading={cancel.isPending}
              onClick={() =>
                cancel.mutate(line.id, {
                  onSuccess: () => toast.success("Item cancelled"),
                  onError: (e) =>
                    toast.error(e instanceof ApiError ? e.message : "Couldn't cancel. Try again."),
                })
              }
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
      <DeliveryActions line={line} />
    </li>
  );
}
