"use client";

import { TriangleAlert } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { errorMessage } from "@/components/admin/query-state";
import { TripOrderPicker } from "@/components/admin/trip-order-picker";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTrip, useTrips } from "@/features/admin/ops-queries";
import { nairobiDate } from "@/features/admin/time";
import { useAdminUsers } from "@/features/admin/user-queries";
import { formatKePhone } from "@/lib/phone";

export function NewTripForm() {
  const router = useRouter();
  const [date, setDate] = React.useState(() => nairobiDate(1));
  const [driver, setDriver] = React.useState("");
  const [orders, setOrders] = React.useState<number[]>([]);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string>();
  const drivers = useAdminUsers({ role: "driver" });
  const sameDay = useTrips(date || undefined);
  const create = useCreateTrip();

  const activeDrivers = (drivers.data ?? []).filter((d) => d.is_active && d.is_driver_active);
  const driverTrips = (sameDay.data ?? []).filter(
    (t) => t.driver === driver && t.status !== "cancelled",
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!driver) return setError("Choose a driver.");
    if (orders.length === 0) return setError("Choose at least one paid order.");
    setError(undefined);
    create.mutate(
      { delivery_date: date, driver, orders, notes: notes.trim() || undefined },
      {
        onSuccess: (trip) => {
          toast.success(`Trip #${trip.id} planned with ${trip.driver_name}`);
          router.push(`/admin/trips/${trip.id}` as Route);
        },
        onError: (err) => setError(errorMessage(err, "Couldn't create the trip.")),
      },
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="trip-date" label="Delivery date" required>
          <Input
            id="trip-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setOrders([]);
            }}
          />
        </Field>
        <Field htmlFor="trip-driver" label="Driver" required>
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger id="trip-driver">
              <SelectValue
                placeholder={drivers.isPending ? "Loading drivers…" : "Choose a driver"}
              />
            </SelectTrigger>
            <SelectContent>
              {activeDrivers.map((d) => (
                <SelectItem key={d.uid} value={d.uid}>
                  {d.full_name} · {formatKePhone(d.phone_number)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {driverTrips.length > 0 ? (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          This driver already has {driverTrips.length} trip{driverTrips.length === 1 ? "" : "s"} on
          this date. That&apos;s allowed; check they have time for both.
        </p>
      ) : null}
      <div className="grid gap-2">
        <h2 className="text-lg font-semibold">Orders on this trip</h2>
        <p className="text-sm text-muted-foreground">
          Tick orders in the order the driver should go. The number shows the stop order.
        </p>
        {date ? (
          <TripOrderPicker
            date={date}
            selected={orders}
            onToggle={(o) =>
              setOrders((ids) =>
                ids.includes(o.id) ? ids.filter((id) => id !== o.id) : [...ids, o.id],
              )
            }
          />
        ) : null}
      </div>
      <Field
        htmlFor="trip-notes"
        label="Notes for the driver"
        hint="Optional, for example the loading time."
      >
        <Input
          id="trip-notes"
          maxLength={255}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={create.isPending} disabled={orders.length === 0}>
          Create trip with {orders.length} order{orders.length === 1 ? "" : "s"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/trips" as Route)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
