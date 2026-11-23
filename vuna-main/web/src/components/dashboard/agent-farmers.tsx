"use client";

import { ChevronRight, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentFarmers } from "@/features/listings/queries";
import { formatKePhone } from "@/lib/phone";

export function AgentFarmers() {
  const { data, isPending, error } = useAgentFarmers();
  if (isPending) return <Skeleton className="h-48 rounded-2xl" />;
  if (error || !data)
    return <p className="text-sm text-destructive">Couldn&apos;t load your farmers.</p>;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No farmers linked to you yet"
        description="An admin links farmers to you. Ask your team lead."
      />
    );
  }
  return (
    <ul className="grid gap-3">
      {data.map((f) => (
        <li key={f.uid}>
          <Link
            href={`/agent/farmers/${f.uid}` as Route}
            className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-shadow outline-none hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <div className="grid flex-1 gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{f.full_name}</p>
                {f.approval_status !== "approved" ? (
                  <Badge variant="warning">Not approved yet</Badge>
                ) : null}
                {f.waiting_orders > 0 ? (
                  <Badge variant="warning">{f.waiting_orders} orders waiting</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatKePhone(f.phone_number)} ·{" "}
                {[f.city, f.cooperative_name].filter(Boolean).join(" · ")} · {f.live_listings} live
                listings
              </p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
