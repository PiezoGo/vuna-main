"use client";

import type { TripStop } from "@vuna/api";
import * as React from "react";
import { toast } from "sonner";

import { errorMessage } from "@/components/admin/query-state";
import { PhotoCapture } from "@/components/delivery/photo-capture";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useStopAction } from "@/features/delivery/queries";
import { shrinkImage } from "@/lib/image-resize";

type Props = { stop: TripStop; kind: "pickup" | "dropoff"; onDone: () => void };

/** Collect (photo + condition check) or deliver (photo) one stop. */
export function StopActionForm({ stop, kind, onDone }: Props) {
  const pickup = kind === "pickup";
  const action = useStopAction(stop.id, pickup ? "collect" : "deliver");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [condition, setCondition] = React.useState<"good" | "issue">("good");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!photo) return setError("Take a photo first.");
    if (pickup && condition === "issue" && note.trim().length < 3)
      return setError("Say what's wrong with the produce.");
    setError(undefined);
    const form = new FormData();
    form.set("photo", await shrinkImage(photo));
    if (pickup) {
      form.set("condition", condition);
      if (note.trim()) form.set("note", note.trim());
    }
    action.mutate(form, {
      onSuccess: () => {
        toast.success(pickup ? "Marked collected" : "Marked delivered");
        onDone();
      },
      onError: (err) =>
        setError(errorMessage(err, "Couldn't save. Check your connection and try again.")),
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-card p-4 shadow-soft">
      <h2 className="text-lg font-semibold">{pickup ? "Collect the produce" : "Hand it over"}</h2>
      <PhotoCapture
        id={`photo-${stop.id}`}
        file={photo}
        onChange={(f) => {
          setPhoto(f);
          setError(undefined);
        }}
        label={pickup ? "Photo of the produce" : "Photo at the drop-off"}
        invalid={Boolean(error) && !photo}
      />
      {pickup ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Condition check</legend>
          <RadioGroup
            value={condition}
            onValueChange={(v) => setCondition(v === "issue" ? "issue" : "good")}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="good" id={`good-${stop.id}`} />
              <Label htmlFor={`good-${stop.id}`}>Good: right amount, fresh</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="issue" id={`issue-${stop.id}`} />
              <Label htmlFor={`issue-${stop.id}`}>There&apos;s an issue</Label>
            </div>
          </RadioGroup>
          <Field
            htmlFor={`note-${stop.id}`}
            label={condition === "issue" ? "What's wrong?" : "Note (optional)"}
          >
            <Textarea
              id={`note-${stop.id}`}
              value={note}
              maxLength={255}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </fieldset>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        variant={pickup ? "default" : "mpesa"}
        loading={action.isPending}
      >
        {pickup ? "Mark collected" : "Mark delivered"}
      </Button>
    </form>
  );
}
