"use client";

import { ShoppingBasket } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cartCount, useCart } from "@/features/cart/store";
import { useMounted } from "@/hooks/use-mounted";

export function CartButton() {
  const count = useCart((s) => cartCount(s.items));
  const mounted = useMounted();
  const shown = mounted ? count : 0;
  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href={"/cart" as Route} aria-label={shown ? `Cart, ${shown} items` : "Cart"}>
        <ShoppingBasket className="size-5" />
        {shown > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
            {shown}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
