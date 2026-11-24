"use client";

import * as React from "react";
import { toast } from "sonner";

import { errorMessage } from "@/components/admin/query-state";
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
import { useRecordMoney, type MoneyKind } from "@/features/admin/money-queries";

type Props = {
  kind: MoneyKind;
  orderId: number;
  title: string;
  description: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Record the M-Pesa reference of a payout or refund sent by hand. */
export function RecordReferenceDialog({
  kind,
  orderId,
  title,
  description,
  open,
  onOpenChange,
}: Props) {
  const record = useRecordMoney(kind);
  const [reference, setReference] = React.useState("");
  const [error, setError] = React.useState<string>();
  const id = `ref-${kind}-${orderId}`;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = reference.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,20}$/.test(value)) {
      setError("Enter the M-Pesa reference, e.g. SKA1B2C3D4.");
      return;
    }
    record.mutate(
      { id: orderId, reference: value },
      {
        onSuccess: () => {
          toast.success(kind === "payout" ? "Payout recorded" : "Refund recorded");
          setReference("");
          onOpenChange(false);
        },
        onError: (err) => setError(errorMessage(err, "Couldn't save. Try again.")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Field
            htmlFor={id}
            label="M-Pesa reference"
            error={error}
            hint="From the M-Pesa confirmation SMS."
          >
            <Input
              id={id}
              value={reference}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={20}
              className="font-mono uppercase"
              onChange={(e) => {
                setReference(e.target.value);
                setError(undefined);
              }}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="mpesa" loading={record.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
