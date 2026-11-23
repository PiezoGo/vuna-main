"use client";

import type { Checkout } from "@vuna/api";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/form-alert";
import { groupByFarmer } from "@/components/cart/cart-view";
import { AddressPicker } from "@/components/checkout/address-picker";
import { MpesaDialog } from "@/components/checkout/mpesa-dialog";
import { PaymentChoice, type PaymentChoiceValue } from "@/components/checkout/payment-choice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/features/cart/store";
import { useCreateCheckout, useQuote } from "@/features/checkout/queries";
import { earliestDeliveryDate } from "@/features/checkout/schemas";
import { useMounted } from "@/hooks/use-mounted";
import { ApiError } from "@/lib/api/errors";
import { formatKES } from "@/lib/format";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="flex items-center gap-3 font-semibold">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-sm text-primary">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CheckoutForm({ phone }: { phone: string }) {
  const router = useRouter();
  const mounted = useMounted();
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const quote = useQuote(items);
  const create = useCreateCheckout();
  const minDate = earliestDeliveryDate();

  const [address, setAddress] = React.useState<number>();
  const [date, setDate] = React.useState(minDate);
  const [choice, setChoice] = React.useState<PaymentChoiceValue>("pay_now");
  const [error, setError] = React.useState<string | null>(null);
  const [placed, setPlaced] = React.useState<Checkout | null>(null);

  if (!mounted || (items.length > 0 && quote.isPending))
    return <Skeleton className="h-96 rounded-2xl" />;
  if (items.length === 0 && !placed) {
    return (
      <p className="text-muted-foreground">
        Your cart is empty.{" "}
        <Link href={"/market" as Route} className="font-medium text-primary hover:underline">
          Browse the market
        </Link>
      </p>
    );
  }

  const goToOrder = (id: number) => router.push(`/orders/${id}` as Route);

  const place = async () => {
    setError(null);
    if (!address) return setError("Choose a delivery address.");
    if (!date || date < minDate) return setError("Choose tomorrow or a later delivery date.");
    try {
      const checkout = await create.mutateAsync({
        items,
        address,
        delivery_date: date,
        payment_choice: choice,
      });
      clearCart();
      if (choice === "pay_now") {
        setPlaced(checkout);
      } else {
        toast.success("Order sent to the farmers");
        goToOrder(checkout.id);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "We couldn't place your order. Please try again.",
      );
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
      <div className="grid gap-5">
        <Step n={1} title="Delivery address">
          <AddressPicker value={address} onChange={setAddress} />
        </Step>
        <Step n={2} title="Delivery date">
          <div className="grid max-w-xs gap-2">
            <Label htmlFor="delivery-date">Deliver on</Label>
            <Input
              id="delivery-date"
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </Step>
        <Step n={3} title="Payment">
          <PaymentChoice value={choice} onChange={setChoice} />
        </Step>
      </div>

      <aside className="grid gap-4 rounded-2xl border bg-card p-5 shadow-soft lg:sticky lg:top-24">
        <h2 className="font-semibold">Your order</h2>
        {quote.data ? (
          <ul className="grid gap-3 text-sm">
            {groupByFarmer(quote.data.lines).map((g) => (
              <li key={g.name} className="grid gap-1">
                <p className="text-xs text-muted-foreground">From {g.name}</p>
                {g.lines.map((l) => (
                  <p key={l.product} className="flex justify-between gap-3">
                    <span className="truncate">
                      {l.title} × {l.quantity}
                    </span>
                    <span>{formatKES(l.total)}</span>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="flex justify-between border-t pt-3 font-semibold">
          <span>Total (delivery included)</span>
          <span>{quote.data ? formatKES(quote.data.total) : "—"}</span>
        </p>
        <FormAlert
          message={
            error ??
            (quote.data && !quote.data.ok ? "Some items need attention in your cart." : null)
          }
        />
        <Button
          size="lg"
          variant={choice === "pay_now" ? "mpesa" : "default"}
          loading={create.isPending}
          disabled={!quote.data?.ok}
          onClick={place}
        >
          {choice === "pay_now" ? "Place order and pay" : "Send order to farmers"}
        </Button>
      </aside>

      {placed ? (
        <MpesaDialog
          checkout={placed}
          phone={phone}
          open
          onOpenChange={(open) => {
            if (!open) goToOrder(placed.id);
          }}
          onPaid={() => {
            toast.success("Paid. Farmers are confirming your order.");
            goToOrder(placed.id);
          }}
        />
      ) : null}
    </div>
  );
}
