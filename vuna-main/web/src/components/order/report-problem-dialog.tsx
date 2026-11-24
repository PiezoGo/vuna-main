"use client";

import type { Order } from "@vuna/api";
import * as React from "react";
import { toast } from "sonner";

import { errorMessage } from "@/components/admin/query-state";
import { PhotoCapture } from "@/components/delivery/photo-capture";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROBLEM_REASONS } from "@/features/delivery/maps";
import { useReportProblem } from "@/features/delivery/queries";
import { shrinkImage } from "@/lib/image-resize";

type Props = { line: Order; open: boolean; onOpenChange: (open: boolean) => void };

export function ReportProblemDialog({ line, open, onOpenChange }: Props) {
  const report = useReportProblem(line.id);
  const [reason, setReason] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason) return setError("Choose what went wrong.");
    if (description.trim().length < 5) return setError("Tell us a little more.");
    if (!photo) return setError("Add a photo of the produce.");
    setError(undefined);
    const form = new FormData();
    form.set("reason", reason);
    form.set("description", description.trim());
    form.set("photo", await shrinkImage(photo));
    report.mutate(form, {
      onSuccess: () => {
        toast.success("Problem reported. VUNA will call you.");
        onOpenChange(false);
      },
      onError: (err) => setError(errorMessage(err, "Couldn't send. Try again.")),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>
              {line.product_title} × {line.quantity}. VUNA checks every report and decides any
              refund.
            </DialogDescription>
          </DialogHeader>
          <Field htmlFor={`reason-${line.id}`} label="What went wrong?">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id={`reason-${line.id}`}>
                <SelectValue placeholder="Choose one" />
              </SelectTrigger>
              <SelectContent>
                {PROBLEM_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field htmlFor={`desc-${line.id}`} label="Details">
            <Textarea
              id={`desc-${line.id}`}
              value={description}
              maxLength={1000}
              placeholder="For example: 3 of the 10 crates were soft"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <PhotoCapture
            id={`problem-photo-${line.id}`}
            file={photo}
            onChange={setPhoto}
            label="Add a photo"
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={report.isPending}>
              Send report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
