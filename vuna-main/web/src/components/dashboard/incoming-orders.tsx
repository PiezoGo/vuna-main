"use client";

import type { Order } from "@vuna/api";
import { Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { CallButton } from "@/components/call/call-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { unitLabel } from "@/features/catalog/product";
import { useAnswerOrder, useIncomingOrders } from "@/features/checkout/queries";
import { statusInfo } from "@/features/orders/status";
import { ApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime, formatKES } from "@/lib/format";

export function IncomingOrders() {
  const { data, isPending, error } = useIncomingOrders();
  if (isPending) return <Skeleton className="h-48 rounded-2xl" />;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Couldn't load orders."}
      </p>
    );

  const waiting = data.filter((o) => o.status === "pending" && o.checkout);
  const others = data.filter((o) => !(o.status === "pending" && o.checkout));
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="font-semibold">Waiting for your answer ({waiting.length})</h2>
        {waiting.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nothing waiting"
            description="New orders appear here, and you'll get a message."
          />
        ) : (
          <ul className="grid gap-3">
            {waiting.map((o) => (
              <IncomingRow key={o.id} order={o} />
            ))}
          </ul>
        )}
      </section>
      {others.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-semibold">Earlier orders</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {others.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1 font-medium">
                  {o.product_title} × {o.quantity} {unitLabel(o.product_unit, o.quantity)} ·{" "}
                  {o.buyer_name}
                </span>
                <Badge variant={statusInfo(o.status).variant}>{statusInfo(o.status).label}</Badge>
                <span className="w-28 text-right">{formatKES(o.farmer_earnings)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function IncomingRow({ order }: { order: Order }) {
  const answer = useAnswerOrder();
  const respond = (kind: "accept" | "decline") =>
    answer.mutate(
      { id: order.id, answer: kind },
      {
        onSuccess: () => toast.success(kind === "accept" ? "Order accepted" : "Order declined"),
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : "Couldn't save your answer. Try again."),
      },
    );
  return (
    <li className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
      <div className="grid flex-1 gap-1">
        <p className="font-semibold">
          {order.product_title} × {order.quantity} {unitLabel(order.product_unit, order.quantity)}
        </p>
        <p className="text-sm text-muted-foreground">
          {order.buyer_name}
          {order.delivery_area ? ` · ${order.delivery_area}` : ""}
          {order.delivery_date ? ` · deliver ${formatDate(order.delivery_date)}` : ""}
        </p>
        <CallButton
          uid={order.buyer}
          name={order.buyer_name}
          orderId={order.id}
          className="w-fit"
        />
        <p className="text-sm">
          You earn <span className="font-semibold">{formatKES(order.farmer_earnings)}</span>
          {order.is_paid ? (
            <Badge variant="success" className="ml-2">
              Buyer has paid
            </Badge>
          ) : null}
        </p>
        {order.answer_deadline ? (
          <p className="text-[12px] text-warning">
            Answer by {formatDateTime(order.answer_deadline)}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => respond("accept")}
          loading={answer.isPending && answer.variables?.answer === "accept"}
          disabled={answer.isPending}
        >
          <Check /> Accept
        </Button>
        <Button
          variant="outline"
          onClick={() => respond("decline")}
          loading={answer.isPending && answer.variables?.answer === "decline"}
          disabled={answer.isPending}
        >
          <X /> Decline
        </Button>
      </div>
    </li>
  );
}
