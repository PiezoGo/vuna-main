"use client";

import { Timer } from "lucide-react";
import * as React from "react";

import { payoutCountdown } from "@/features/admin/time";
import { cn } from "@/lib/utils";

/** Live countdown to the 4-hour payout promise; red once overdue. */
export function PayoutCountdown({ dueBy }: { dueBy: string | null | undefined }) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const countdown = payoutCountdown(dueBy, now);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        countdown.overdue
          ? "bg-destructive text-destructive-foreground"
          : countdown.urgent
            ? "bg-warning-soft text-warning"
            : "bg-success-soft text-success",
      )}
    >
      <Timer className="size-3" aria-hidden /> {countdown.label}
    </span>
  );
}
