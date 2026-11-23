"use client";

import { RotateCcw, WifiOff } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProductError({
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
    <section className="container-page py-16">
      <EmptyState
        icon={WifiOff}
        title="We couldn't load this product"
        description="This is usually a connection problem. Please try again."
        action={
          <Button onClick={reset}>
            <RotateCcw /> Try again
          </Button>
        }
      />
    </section>
  );
}
