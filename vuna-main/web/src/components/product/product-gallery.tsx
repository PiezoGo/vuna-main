"use client";

import * as React from "react";

import { ProductImage } from "@/components/product/product-image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = React.useState(0);
  const current = images[active] ?? images[0];
  return (
    <div className="grid gap-3">
      <ProductImage
        src={current}
        alt={title}
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="aspect-[4/3] rounded-2xl border"
      />
      {images.length > 1 ? (
        <div className="flex gap-3" role="group" aria-label="Photos">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1} of ${images.length}`}
              aria-pressed={index === active}
              className={cn(
                "size-20 cursor-pointer overflow-hidden rounded-xl border-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                index === active
                  ? "border-primary"
                  : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              <ProductImage src={src} alt="" sizes="80px" className="size-full" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
