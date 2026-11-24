"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AdminError({
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
    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive-soft text-destructive">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <h1 className="font-display text-2xl font-semibold">This page didn&apos;t load</h1>
      <p className="max-w-md text-muted-foreground">
        Please try again. If it keeps happening, check the server logs.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
      ) : null}
      <Button onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
