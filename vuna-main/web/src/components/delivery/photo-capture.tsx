"use client";

import { Camera, RotateCcw } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  invalid?: boolean;
};

/** Opens the phone camera (or the photo picker on a computer) and previews the photo. */
export function PhotoCapture({ id, file, onChange, label = "Take a photo", invalid }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const preview = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  return (
    <div className="grid gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        // A local blob preview: next/image can't optimise it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Photo to upload"
          className="max-h-72 w-full rounded-xl border object-cover"
        />
      ) : null}
      <Button
        type="button"
        variant={preview ? "outline" : "default"}
        size="lg"
        className={cn("w-full", invalid && "ring-2 ring-destructive")}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? <RotateCcw /> : <Camera />} {preview ? "Retake photo" : label}
      </Button>
    </div>
  );
}
