"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { route, routes } from "@/config/routes";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive-soft text-destructive">
        <TriangleAlert className="size-7" aria-hidden />
      </div>
      <h1 className="mt-6 font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        We hit a snag loading this page. Please try again. If it keeps happening, let us know.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>
          <RotateCcw /> Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href={route(routes.root)}>Go home</Link>
        </Button>
      </div>
    </main>
  );
}
