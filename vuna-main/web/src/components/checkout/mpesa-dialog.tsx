"use client";

import type { Checkout } from "@vuna/api";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
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
import { usePayCheckout } from "@/features/checkout/queries";
import { ApiError } from "@/lib/api/errors";
import { formatKES } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

type Props = {
  checkout: Pick<Checkout, "id" | "amount_due">;
  phone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: (checkout: Checkout) => void;
};

type Step = "confirm" | "waiting" | "done";

/**
 * Simulated M-Pesa STK Push. The real Daraja prompt replaces the 'waiting' step in Module 5;
 * the dialog's shape stays the same.
 */
export function MpesaDialog({ checkout, phone, open, onOpenChange, onPaid }: Props) {
  const pay = usePayCheckout(checkout.id);
  const [step, setStep] = React.useState<Step>("confirm");
  const [error, setError] = React.useState<string | null>(null);

  const start = async () => {
    setError(null);
    setStep("waiting");
    await new Promise((resolve) => setTimeout(resolve, 2500));
    try {
      const paid = await pay.mutateAsync();
      setStep("done");
      setTimeout(() => onPaid(paid), 1200);
    } catch (err) {
      setStep("confirm");
      setError(
        err instanceof ApiError ? err.message : "Payment didn't go through. Please try again.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => step !== "waiting" && onOpenChange(next)}>
      <DialogContent showClose={step !== "waiting"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-mpesa text-mpesa-foreground">
              <Smartphone className="size-4" />
            </span>
            Pay with M-Pesa
          </DialogTitle>
          <DialogDescription>
            Test payment: no money moves until live M-Pesa is switched on.
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="grid gap-4">
            <div className="rounded-xl bg-muted p-4">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-semibold">{formatKES(checkout.amount_due)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A payment request will go to{" "}
                <span className="font-medium text-foreground">{formatKePhone(phone)}</span>.
              </p>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        ) : step === "waiting" ? (
          <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
            <Loader2 className="size-10 animate-spin text-mpesa" aria-hidden />
            <p className="font-semibold">Check your phone</p>
            <p className="text-sm text-muted-foreground">
              Enter your M-Pesa PIN to approve the payment.
            </p>
          </div>
        ) : (
          <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
            <CheckCircle2 className="size-12 text-success" aria-hidden />
            <p className="font-semibold">Payment received</p>
          </div>
        )}

        {step === "confirm" ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Later
            </Button>
            <Button variant="mpesa" onClick={start}>
              Send payment request
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
