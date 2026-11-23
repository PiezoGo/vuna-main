"use client";

import type { QuoteLine } from "@vuna/api";
import { Trash2 } from "lucide-react";

import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { ProductImage } from "@/components/product/product-image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/store";
import { productImages, unitLabel } from "@/features/catalog/product";
import { formatKES } from "@/lib/format";

export function CartLine({ line }: { line: QuoteLine }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const [cover] = productImages({ images: line.images });

  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <ProductImage
        src={cover}
        alt={line.title}
        sizes="80px"
        className="size-20 shrink-0 rounded-xl"
      />
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="font-semibold">{line.title}</p>
        <p className="text-sm text-muted-foreground">
          {formatKES(line.unit_price)} / {unitLabel(line.unit)}
          {line.min_order_quantity > 1 ? ` · minimum ${line.min_order_quantity}` : ""}
        </p>
        {line.error ? (
          <p role="alert" className="text-sm text-destructive">
            {line.error}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <QuantityStepper
          id={`cart-${line.product}`}
          value={line.quantity}
          min={1}
          max={Math.max(1, line.available)}
          onChange={(q) => setQuantity(line.product, q)}
        />
        <p className="w-28 text-right font-semibold">{line.error ? "—" : formatKES(line.total)}</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => remove(line.product)}
          aria-label={`Remove ${line.title}`}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
