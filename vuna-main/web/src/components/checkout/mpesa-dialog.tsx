"use client";

import type { Checkout } from "@vuna/api";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { checkoutKeys, usePayment, useStartPayment } from "@/features/checkout/queries";
import { ApiError } from "@/lib/api/errors";
import { formatKES } from "@/lib/format";
import { formatKePhone, normalizeKePhone } from "@/lib/phone";

type Props = {
  checkout: Pick<Checkout, "id" | "amount_due">;
  phone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
};

/** M-Pesa Express: sends a prompt to the buyer's phone and waits for Safaricom's answer. */
export function MpesaDialog({ checkout, phone, open, onOpenChange, onPaid }: Props) {
  const queryClient = useQueryClient();
  const start = useStartPayment(checkout.id);
  const [paymentId, setPaymentId] = React.useState<number | null>(null);
  const payment = usePayment(paymentId);
  const [number, setNumber] = React.useState(formatKePhone(phone));
  const [error, setError] = React.useState<string | null>(null);

  const status = payment.data?.status ?? (paymentId ? "requested" : "idle");
  const finished = status === "paid" || status === "failed";

  // Keep the latest callback without re-running the effect when the parent re-renders.
  const onPaidRef = React.useRef(onPaid);
  React.useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  React.useEffect(() => {
    if (!finished) return;
    void queryClient.invalidateQueries({ queryKey: checkoutKeys.checkout(checkout.id) });
    void queryClient.invalidateQueries({ queryKey: checkoutKeys.checkouts });
    if (status === "paid") {
      const timer = setTimeout(() => onPaidRef.current(), 1200);
      return () => clearTimeout(timer);
    }
  }, [finished, status, checkout.id, queryClient]);

  const send = async () => {
    setError(null);
    const normalized = normalizeKePhone(number);
    if (!normalized) return setError("Enter a Safaricom number, for example 0712 345 678.");
    try {
      const started = await start.mutateAsync(normalized);
      setPaymentId(started.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.field("phone") ?? err.message)
          : "Couldn't reach M-Pesa. Please try again.",
      );
    }
  };

  const retry = () => {
    setPaymentId(null);
    setError(null);
  };

  const waiting = status === "requested";
  const simulated = payment.data?.simulated;

  return (
    <Dialog open={open} onOpenChange={(next) => !waiting && onOpenChange(next)}>
      <DialogContent showClose={!waiting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-mpesa text-mpesa-foreground">
              <Smartphone className="size-4" />
            </span>
            Pay with M-Pesa
          </DialogTitle>
          <DialogDescription>
            {simulated
              ? "Test payment: no money moves."
              : "You'll get a prompt on your phone to enter your M-Pesa PIN."}
          </DialogDescription>
        </DialogHeader>

        {status === "idle" ? (
          <div className="grid gap-4">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-semibold">
                {formatKES(Math.ceil(Number(checkout.amount_due)), { whole: true })}
              </p>
              {Number(checkout.amount_due) % 1 !== 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  M-Pesa charges whole shillings, so cents are rounded up.
                </p>
              ) : null}
            </div>
            <Field htmlFor="mpesa-phone" label="M-Pesa number" error={error ?? undefined}>
              <Input
                id="mpesa-phone"
                type="tel"
                inputMode="tel"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                aria-invalid={Boolean(error)}
              />
            </Field>
          </div>
        ) : waiting ? (
          <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
            <Loader2 className="size-10 animate-spin text-mpesa" aria-hidden />
            <p className="font-semibold">Check your phone</p>
            <p className="text-sm text-muted-foreground">
              {payment.data?.message ?? "Enter your M-Pesa PIN to approve the payment."}
            </p>
          </div>
        ) : status === "paid" ? (
          <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
            <CheckCircle2 className="size-12 text-success" aria-hidden />
            <p className="font-semibold">Payment received</p>
            {payment.data?.receipt_number ? (
              <p className="text-sm text-muted-foreground">
                M-Pesa receipt {payment.data.receipt_number}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid justify-items-center gap-3 py-6 text-center" role="alert">
            <XCircle className="size-12 text-destructive" aria-hidden />
            <p className="font-semibold">Payment didn&apos;t go through</p>
            <p className="text-sm text-muted-foreground">{payment.data?.message}</p>
          </div>
        )}

        {status === "idle" ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Later
            </Button>
            <Button variant="mpesa" loading={start.isPending} onClick={send}>
              Send payment request
            </Button>
          </DialogFooter>
        ) : status === "failed" ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="mpesa" onClick={retry}>
              Try again
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
