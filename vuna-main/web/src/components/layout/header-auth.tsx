"use client";

import Link from "next/link";

import { CartButton } from "@/components/cart/cart-button";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { route, routes } from "@/config/routes";
import { useSession } from "@/features/auth/queries";

/**
 * The header's right side. Loaded on the client so public pages stay static and cacheable
 * while still showing the signed-in user.
 */
export function HeaderAuth() {
  const { data: user, isPending } = useSession();

  if (isPending) return <Skeleton className="size-9 rounded-full" />;
  if (user) {
    return (
      <>
        {user.role === "buyer" ? <CartButton /> : null}
        <UserMenu user={user} />
      </>
    );
  }
  return (
    <>
      <Button variant="ghost" asChild>
        <Link href={route(routes.login)}>Sign in</Link>
      </Button>
      <Button asChild>
        <Link href={route(routes.signup)}>Get started</Link>
      </Button>
    </>
  );
}
