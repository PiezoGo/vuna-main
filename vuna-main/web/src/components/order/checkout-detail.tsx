"use client";

import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { MpesaDialog } from "@/components/checkout/mpesa-dialog";
import { OrderLineRow } from "@/components/order/order-line-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCheckout } from "@/features/checkout/queries";
import { CHECKOUT_STATE } from "@/features/orders/status";
import { ApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime, formatKES } from "@/lib/format";

export function CheckoutDetail({ id, phone }: { id: number; phone: string }) {
  const { data: checkout, isPending, error } = useCheckout(id);
  const [paying, setPaying] = React.useState(false);

  if (isPending) return <Skeleton className="h-96 rounded-2xl" />;
  if (error || !checkout) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError && error.status === 404
          ? "We couldn't find that order."
          : "Couldn't load this order."}{" "}
        <Link href={"/orders" as Route} className="underline">
          Back to my orders
        </Link>
      </p>
    );
  }

  const state = CHECKOUT_STATE[checkout.state] ?? CHECKOUT_STATE.closed!;
  const money = [
    { label: "Order total", value: checkout.total },
    { label: "Paid", value: checkout.amount_paid },
    ...(Number(checkout.amount_refunded) > 0
      ? [{ label: "Refunded", value: checkout.amount_refunded }]
      : []),
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={<Link href={"/orders" as Route}>My orders</Link>}
        title={`Order #${checkout.id}`}
        description={`Placed ${formatDateTime(checkout.created_at)} · deliver ${formatDate(checkout.delivery_date)}`}
        actions={
          <Badge variant={state.variant} className="px-3 py-1 text-sm">
            {state.label}
          </Badge>
        }
      />

      {checkout.can_pay ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-mpesa/30 bg-success-soft p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-semibold">Ready to pay {formatKES(checkout.amount_due)}</p>
            <p className="text-sm text-muted-foreground">
              {checkout.pay_deadline
                ? `Pay before ${formatDateTime(checkout.pay_deadline)} or the items are released.`
                : state.help}
            </p>
          </div>
          <Button variant="mpesa" size="lg" onClick={() => setPaying(true)}>
            Pay with M-Pesa
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{state.help}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <ul className="divide-y rounded-2xl border bg-card shadow-soft">
          {checkout.lines.map((line) => (
            <OrderLineRow key={line.id} line={line} checkoutId={checkout.id} />
          ))}
        </ul>
        <aside className="grid gap-4 rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="font-semibold">Delivery</h2>
          <p className="text-sm">
            {checkout.contact_name}
            <br />
            {checkout.details}, {checkout.area}
            {checkout.landmark ? (
              <>
                <br />
                Near {checkout.landmark}
              </>
            ) : null}
          </p>
          <dl className="grid gap-2 border-t pt-4 text-sm">
            {money.map((m) => (
              <div key={m.label} className="flex justify-between">
                <dt className="text-muted-foreground">{m.label}</dt>
                <dd className="font-medium">{formatKES(m.value)}</dd>
              </div>
            ))}
          </dl>
          {checkout.payment_reference ? (
            <p className="text-[12px] text-muted-foreground">
              Payment reference {checkout.payment_reference}
            </p>
          ) : null}
        </aside>
      </div>

      {paying ? (
        <MpesaDialog
          checkout={checkout}
          phone={phone}
          open
          onOpenChange={setPaying}
          onPaid={() => {
            setPaying(false);
            toast.success("Payment received");
          }}
        />
      ) : null}
    </div>
  );
}
