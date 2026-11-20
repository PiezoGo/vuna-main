import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  /** id of the control inside; links the label and the messages to it. */
  htmlFor: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Label + control + hint/error, wired for screen readers. Pass the same id to the
 * control and set `aria-describedby={fieldDescribedBy(id, ...)}` and `aria-invalid`.
 */
export function Field({ htmlFor, label, hint, error, required, className, children }: FieldProps) {
  return (
    <div data-slot="field" className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function fieldDescribedBy(id: string, opts: { error?: string; hint?: React.ReactNode }) {
  if (opts.error) return `${id}-error`;
  if (opts.hint) return `${id}-hint`;
  return undefined;
}
