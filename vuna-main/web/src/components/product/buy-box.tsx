"use client";

import { LogIn } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { AddToCart } from "@/components/cart/add-to-cart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { useSession } from "@/features/auth/queries";

type BuyBoxProps = {
  productPath: string;
  productId: number;
  unit: string;
  min: number;
  available: number;
};

/** Buying actions depend on who is looking. */
export function BuyBox({ productPath, productId, unit, min, available }: BuyBoxProps) {
  const soldOut = available <= 0 || available < min;
  const { data: user, isPending } = useSession();

  if (isPending) return <Skeleton className="h-12 w-full rounded-xl" />;
  if (soldOut) {
    return (
      <Button size="lg" disabled className="w-full">
        Sold out
      </Button>
    );
  }
  if (!user) {
    return (
      <Button size="lg" asChild className="w-full">
        <Link href={`${routes.login}?next=${encodeURIComponent(productPath)}` as Route}>
          <LogIn /> Sign in to buy
        </Link>
      </Button>
    );
  }
  if (user.role !== "buyer") {
    return (
      <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        Only buyer accounts can place orders.
      </p>
    );
  }
  return <AddToCart productId={productId} unit={unit} min={min} available={available} />;
}
