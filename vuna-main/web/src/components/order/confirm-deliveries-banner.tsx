"use client";

import { PackageCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { useSession } from "@/features/auth/queries";
import { useAwaitingConfirmation } from "@/features/delivery/queries";

/** Shown to buyers on every page until they confirm (or report a problem on) delivered lines. */
export function ConfirmDeliveriesBanner() {
  const session = useSession();
  const isBuyer = session.data?.role === "buyer";
  const { data } = useAwaitingConfirmation(isBuyer);
  const waiting = (data ?? []).filter((o) => !o.problem);
  if (!isBuyer || waiting.length === 0) return null;
  const first = waiting[0];
  const href = (first?.checkout ? `/orders/${first.checkout}` : "/orders") as Route;
  return (
    <div className="border-b border-success/30 bg-success-soft">
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
        <PackageCheck className="size-4 text-success" aria-hidden />
        <p className="font-medium">
          {waiting.length === 1 ? "1 delivery" : `${waiting.length} deliveries`} to confirm
        </p>
        <Link href={href} className="font-semibold text-success underline underline-offset-2">
          Check and confirm
        </Link>
      </div>
    </div>
  );
}
