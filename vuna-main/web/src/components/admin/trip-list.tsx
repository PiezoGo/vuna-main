"use client";

import { Truck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { TripStatusBadge } from "@/components/admin/trip-status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTrips } from "@/features/admin/ops-queries";
import { formatDate } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

export function TripList() {
  const [date, setDate] = React.useState("");
  const { data, isPending, error } = useTrips(date || undefined);

  return (
    <div className="grid gap-5">
      <div className="grid max-w-xs gap-1.5">
        <Label htmlFor="trip-date">Delivery date</Label>
        <Input id="trip-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <p className="text-[13px] text-muted-foreground">
          {date ? "Trips for this date." : "Showing the last 7 days and upcoming trips."}
        </p>
      </div>
      {isPending ? (
        <ListSkeleton label="Loading trips" />
      ) : error ? (
        <QueryError error={error} fallback="Couldn't load trips." />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No trips yet"
          description="Put paid orders on a trip with a driver."
          action={
            <Button asChild>
              <Link href={"/admin/trips/new" as Route}>Plan a trip</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {data.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/admin/trips/${trip.id}` as Route}
                className="grid gap-1 rounded-2xl border bg-card p-4 shadow-soft outline-none hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">Trip #{trip.id}</span>
                  <p className="font-semibold">{formatDate(trip.delivery_date)}</p>
                  <TripStatusBadge status={trip.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {trip.driver_name} · {formatKePhone(trip.driver_phone)} · {trip.stop_count} order
                  {trip.stop_count === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
