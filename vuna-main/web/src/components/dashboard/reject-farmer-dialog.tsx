"use client";

import type { FarmerApproval } from "@vuna/api";
import * as React from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { useRejectFarmer } from "@/features/admin/queries";
import { ApiError } from "@/lib/api/errors";

type Props = { farmer: FarmerApproval; open: boolean; onOpenChange: (open: boolean) => void };

export function RejectFarmerDialog({ farmer, open, onOpenChange }: Props) {
  const reject = useRejectFarmer();
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setError("Write a short reason the farmer will see.");
      return;
    }
    reject.mutate(
      { uid: farmer.uid, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`${farmer.full_name} declined`);
          onOpenChange(false);
          setReason("");
        },
        onError: (err) =>
          setError(
            err instanceof ApiError
              ? (err.field("reason") ?? err.message)
              : "Couldn't save. Try again.",
          ),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Decline {farmer.full_name}?</DialogTitle>
            <DialogDescription>
              Their listings stay hidden. They will see the reason on their dashboard.
            </DialogDescription>
          </DialogHeader>
          <Field htmlFor={`reason-${farmer.uid}`} label="Reason" error={error}>
            <Textarea
              id={`reason-${farmer.uid}`}
              value={reason}
              maxLength={255}
              onChange={(e) => {
                setReason(e.target.value);
                setError(undefined);
              }}
              placeholder="For example: couldn't reach you on the phone number given"
              aria-invalid={Boolean(error)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={reject.isPending}>
              Decline farmer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
