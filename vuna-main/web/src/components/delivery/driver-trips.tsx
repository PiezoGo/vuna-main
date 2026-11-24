"use client";

import { Truck } from "lucide-react";

import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { TripStatusBadge } from "@/components/admin/trip-status-badge";
import { DriverStopRow } from "@/components/delivery/driver-stop-row";
import { EmptyState } from "@/components/ui/empty-state";
import { nairobiDate } from "@/features/admin/time";
import { useDriverTrips } from "@/features/delivery/queries";
import { formatDate } from "@/lib/format";

/** The driver's trips: today and upcoming (`when="upcoming"`) or the last 14 days (`"past"`). */
export function DriverTrips({ when }: { when: "upcoming" | "past" }) {
  const { data, isPending, error } = useDriverTrips();
  if (isPending) return <ListSkeleton rows={3} label="Loading your trips" />;
  if (error) return <QueryError error={error} fallback="Couldn't load your trips." />;

  const today = nairobiDate(0);
  const trips = data.filter((t) =>
    when === "upcoming" ? t.delivery_date >= today : t.delivery_date < today,
  );
  if (trips.length === 0)
    return (
      <EmptyState
        icon={Truck}
        title={when === "upcoming" ? "No trips yet" : "No past trips"}
        description={
          when === "upcoming"
            ? "When VUNA puts you on a trip, your stops appear here in order."
            : undefined
        }
      />
    );

  return (
    <div className="grid gap-8">
      {trips.map((trip) => (
        <section key={trip.id} className="grid gap-4" aria-labelledby={`trip-${trip.id}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`trip-${trip.id}`} className="text-lg font-semibold">
              {trip.delivery_date === today ? "Today" : formatDate(trip.delivery_date)}
            </h2>
            <TripStatusBadge status={trip.status} />
            <span className="text-sm text-muted-foreground">Trip #{trip.id}</span>
          </div>
          {trip.notes ? (
            <p className="rounded-xl bg-muted p-3 text-sm">Note from VUNA: {trip.notes}</p>
          ) : null}
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            1. Farm pickups
          </h3>
          <ol className="grid gap-3">
            {trip.stops.map((stop, i) => (
              <DriverStopRow key={`p${stop.id}`} stop={stop} kind="pickup" position={i + 1} />
            ))}
          </ol>
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            2. Drop-offs
          </h3>
          <ol className="grid gap-3">
            {trip.stops.map((stop, i) => (
              <DriverStopRow
                key={`d${stop.id}`}
                stop={stop}
                kind="dropoff"
                position={trip.stops.length + i + 1}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
