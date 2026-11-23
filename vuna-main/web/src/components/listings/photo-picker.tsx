"use client";

import { ImagePlus, X } from "lucide-react";
import * as React from "react";

import { ProductImage } from "@/components/product/product-image";
import { Button } from "@/components/ui/button";

/** A photo slot: an existing image (by URL), a new file, or empty. */
export type PhotoSlot =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; preview: string }
  | { kind: "empty" };

type Props = { slots: PhotoSlot[]; onChange: (slots: PhotoSlot[]) => void; disabled?: boolean };

export function PhotoPicker({ slots, onChange, disabled }: Props) {
  const inputs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Release object URLs we created for previews.
  React.useEffect(
    () => () => slots.forEach((s) => s.kind === "new" && URL.revokeObjectURL(s.preview)),
    // Only on unmount: revoking earlier would blank the previews still on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const set = (index: number, slot: PhotoSlot) =>
    onChange(slots.map((s, i) => (i === index ? slot : s)));

  return (
    <div className="grid grid-cols-3 gap-3">
      {slots.map((slot, index) => (
        <div key={index} className="relative">
          {slot.kind === "empty" ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputs.current[index]?.click()}
              className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <ImagePlus className="size-6" aria-hidden />
              <span className="text-[12px]">{index === 0 ? "Main photo" : "Add photo"}</span>
            </button>
          ) : (
            <>
              <ProductImage
                src={slot.kind === "existing" ? slot.url : slot.preview}
                alt={`Photo ${index + 1}`}
                sizes="160px"
                className="aspect-square rounded-xl border"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                disabled={disabled}
                className="absolute top-1.5 right-1.5 shadow-soft"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => set(index, { kind: "empty" })}
              >
                <X />
              </Button>
            </>
          )}
          <input
            ref={(el) => {
              inputs.current[index] = el;
            }}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) set(index, { kind: "new", file, preview: URL.createObjectURL(file) });
              e.target.value = "";
            }}
          />
        </div>
      ))}
    </div>
  );
}
