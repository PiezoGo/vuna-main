"use client";

import type { Problem } from "@vuna/api";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDecideProblem } from "@/features/admin/problem-queries";
import { formatKES } from "@/lib/format";

type Props = { problem: Problem; open: boolean; onOpenChange: (open: boolean) => void };
type Choice = "full" | "partial" | "reject";

/** Refund in full, refund part, or reject; refunds say whose fault it was. */
export function DecideProblemDialog({ problem, open, onOpenChange }: Props) {
  const decide = useDecideProblem(problem.id);
  const [choice, setChoice] = React.useState<Choice>("full");
  const [fault, setFault] = React.useState<"farmer" | "vuna">("farmer");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (note.trim().length < 3) return setError("Write a short note the buyer will see.");
    if (choice === "partial" && !/^\d+(\.\d{1,2})?$/.test(amount.trim()))
      return setError("Enter the refund amount in KSh, e.g. 600.");
    setError(undefined);
    decide.mutate(
      {
        decision: choice === "reject" ? "reject" : "refund",
        fault: choice === "reject" ? undefined : fault,
        amount: choice === "partial" ? amount.trim() : null,
        note: note.trim(),
      },
      {
        onSuccess: () => {
          toast.success(
            choice === "reject" ? "Problem rejected" : "Refund added to the refunds queue",
          );
          onOpenChange(false);
        },
        onError: (err) => setError(errorMessage(err, "Couldn't save. Try again.")),
      },
    );
  };

  const radio = (value: string, label: React.ReactNode, group: string) => (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={`${group}-${value}-${problem.id}`} />
      <Label htmlFor={`${group}-${value}-${problem.id}`}>{label}</Label>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Decide problem #{problem.id}</DialogTitle>
            <DialogDescription>
              {problem.buyer_name} paid {formatKES(problem.total_price)} for {problem.quantity}{" "}
              {problem.unit} {problem.product_title}.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={choice}
            onValueChange={(v) => setChoice(v as Choice)}
            aria-label="Decision"
          >
            {radio("full", `Refund in full (${formatKES(problem.total_price)})`, "choice")}
            {radio("partial", "Refund part", "choice")}
            {radio("reject", "Reject: no refund", "choice")}
          </RadioGroup>
          {choice === "partial" ? (
            <Field htmlFor={`amount-${problem.id}`} label="Refund amount (KSh)">
              <Input
                id={`amount-${problem.id}`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          ) : null}
          {choice !== "reject" ? (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Whose fault?</legend>
              <RadioGroup
                value={fault}
                onValueChange={(v) => setFault(v === "vuna" ? "vuna" : "farmer")}
              >
                {radio("farmer", "The farmer's: their share comes off their next payout", "fault")}
                {radio(
                  "vuna",
                  "VUNA's (handling or delivery): the farmer keeps their payout",
                  "fault",
                )}
              </RadioGroup>
            </fieldset>
          ) : null}
          <Field htmlFor={`note-${problem.id}`} label="Note for the buyer">
            <Input
              id={`note-${problem.id}`}
              maxLength={255}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={decide.isPending}>
              Save decision
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
