"use client";

import { Phone, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ListSkeleton, QueryError, errorMessage } from "@/components/admin/query-state";
import { TripStatusBadge } from "@/components/admin/trip-status-badge";
import { TripStopCard } from "@/components/admin/trip-stop-card";
import { Button } from "@/components/ui/button";
import { useCancelTrip, useSetTripOrders, useTrip } from "@/features/admin/ops-queries";
import { formatDate } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

export function TripDetail({ id }: { id: number }) {
  const { data: trip, isPending, error } = useTrip(id);
  const cancel = useCancelTrip(id);
  const setOrders = useSetTripOrders(id);

  if (isPending) return <ListSkeleton rows={4} label="Loading trip" />;
  if (error) return <QueryError error={error} fallback="Couldn't load this trip." />;

  const planned = trip.status === "planned";
  const canCancel =
    (planned || trip.status === "in_progress") && trip.stops.every((s) => !s.collected_at);

  const onCancel = () => {
    if (!window.confirm("Cancel this trip? Its orders go back to the paid list.")) return;
    cancel.mutate(undefined, {
      onSuccess: () => toast.success(`Trip #${id} cancelled`),
      onError: (err) => toast.error(errorMessage(err, "Couldn't cancel the trip.")),
    });
  };
  const remove = (orderId: number) =>
    setOrders.mutate(
      trip.stops.map((s) => s.id).filter((sid) => sid !== orderId),
      {
        onSuccess: () => toast.success(`Order #${orderId} taken off the trip`),
        onError: (err) => toast.error(errorMessage(err, "Couldn't change the trip.")),
      },
    );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">{formatDate(trip.delivery_date)}</p>
            <TripStatusBadge status={trip.status} />
          </div>
          <p className="text-sm">
            Driver: <span className="font-medium">{trip.driver_name}</span>{" "}
            <a
              href={`tel:+${trip.driver_phone}`}
              className="inline-flex items-center gap-1 text-primary"
            >
              <Phone className="size-3.5" aria-hidden /> {formatKePhone(trip.driver_phone)}
            </a>
          </p>
          {trip.notes ? <p className="text-sm text-muted-foreground">Notes: {trip.notes}</p> : null}
        </div>
        {canCancel ? (
          <Button variant="outline" onClick={onCancel} loading={cancel.isPending}>
            <X /> Cancel trip
          </Button>
        ) : null}
      </div>

      <section className="grid gap-3" aria-labelledby="pickups">
        <h2 id="pickups" className="text-lg font-semibold">
          1. Farm pickups
        </h2>
        <ol className="grid gap-3">
          {trip.stops.map((stop, i) => (
            <TripStopCard
              key={stop.id}
              stop={stop}
              kind="pickup"
              position={i + 1}
              action={
                planned && trip.stops.length > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(stop.id)}
                    disabled={setOrders.isPending}
                  >
                    Remove
                  </Button>
                ) : null
              }
            />
          ))}
        </ol>
      </section>
      <section className="grid gap-3" aria-labelledby="dropoffs">
        <h2 id="dropoffs" className="text-lg font-semibold">
          2. Buyer drop-offs
        </h2>
        <ol className="grid gap-3">
          {trip.stops.map((stop, i) => (
            <TripStopCard
              key={stop.id}
              stop={stop}
              kind="dropoff"
              position={trip.stops.length + i + 1}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}
