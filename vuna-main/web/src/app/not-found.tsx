import { Sprout } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { route, routes } from "@/config/routes";

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
    >
      <Link href={route(routes.root)} aria-label="VUNA home">
        <Logo />
      </Link>
      <div className="mt-12 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Sprout className="size-7" aria-hidden />
      </div>
      <p className="mt-6 text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Nothing growing here</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href={route(routes.root)}>Go home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={route(routes.market)}>Browse the market</Link>
        </Button>
      </div>
    </main>
  );
}
