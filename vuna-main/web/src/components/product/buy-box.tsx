"use client";

import { LogIn, ShoppingBasket } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { useSession } from "@/features/auth/queries";

/** Buying actions depend on who is looking. The cart itself arrives in Module 4. */
export function BuyBox({ productPath, soldOut }: { productPath: string; soldOut: boolean }) {
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
  return (
    <div className="grid gap-2">
      <Button size="lg" disabled className="w-full">
        <ShoppingBasket /> Add to cart
      </Button>
      <p className="text-center text-[13px] text-muted-foreground">
        Ordering opens in the next update.
      </p>
    </div>
  );
}
