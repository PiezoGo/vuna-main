"use client";

import { ShoppingBasket } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/store";
import { unitLabel } from "@/features/catalog/product";
import { useMounted } from "@/hooks/use-mounted";

type Props = { productId: number; unit: string; min: number; available: number };

/** Totals are shown in the cart, priced by the server; nothing is multiplied here. */
export function AddToCart({ productId, unit, min, available }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const stored = useCart((s) => s.items.find((i) => i.product === productId)?.quantity ?? 0);
  // The cart lives in this browser's storage: ignore it until hydration is done, or the
  // server and client HTML would differ.
  const inCart = useMounted() ? stored : 0;
  const [quantity, setQuantity] = React.useState(Math.min(min, available));
  const canAdd = available - inCart >= quantity && quantity >= min;

  return (
    <div className="grid gap-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <QuantityStepper
          id={`qty-${productId}`}
          value={quantity}
          min={min}
          max={Math.max(min, available - inCart)}
          onChange={setQuantity}
          unit={unitLabel(unit, quantity)}
        />
      </div>
      <Button
        size="lg"
        disabled={!canAdd}
        onClick={() => {
          add(productId, quantity);
          toast.success("Added to your cart", {
            action: { label: "View cart", onClick: () => router.push("/cart" as Route) },
          });
        }}
      >
        <ShoppingBasket /> Add to cart
      </Button>
      {inCart > 0 ? (
        <p className="text-center text-[13px] text-muted-foreground">
          {inCart} {unitLabel(unit, inCart)} already in your{" "}
          <Link href={"/cart" as Route} className="font-medium text-primary hover:underline">
            cart
          </Link>
        </p>
      ) : null}
    </div>
  );
}
