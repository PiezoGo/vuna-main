"use client";

import { MapPin, Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CallButton } from "@/components/call/call-button";
import { QueryError } from "@/components/admin/query-state";
import { DeliveryChat } from "@/components/delivery/delivery-chat";
import { StopActionForm } from "@/components/delivery/stop-action-form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { mapsUrl } from "@/features/delivery/maps";
import { useDriverStop } from "@/features/delivery/queries";
import { formatDateTime } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

export function DriverStopDetail({ id, kind }: { id: number; kind: "pickup" | "dropoff" }) {
  const router = useRouter();
  const { data: stop, isPending, error } = useDriverStop(id);
  if (isPending) return <Skeleton className="h-80 rounded-2xl" />;
  if (error) return <QueryError error={error} fallback="Couldn't load this stop." />;

  const pickup = kind === "pickup";
  const phone = pickup ? stop.farmer_phone : stop.contact_phone;
  const address = pickup
    ? [stop.farmer_market, stop.farmer_city]
    : [stop.details, stop.area, stop.landmark];
  const map = mapsUrl(address);
  const canAct = pickup
    ? stop.status === "assigned"
    : stop.status === "collected" || stop.status === "in_transit";
  const doneAt = pickup ? stop.collected_at : stop.delivered_at;
  const chatOpen = ["assigned", "collected", "in_transit", "delivered"].includes(stop.status);

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 rounded-2xl border bg-card p-4 text-sm shadow-soft">
        <p className="text-lg font-semibold">
          {pickup ? stop.farmer_name : stop.contact_name || stop.buyer_name}
        </p>
        {!pickup && stop.contact_name ? (
          <p className="text-muted-foreground">For {stop.buyer_name}</p>
        ) : null}
        <p>
          {pickup ? "Collect" : "Deliver"} {stop.quantity} {stop.unit} {stop.product_title} (order #
          {stop.id})
        </p>
        <p className="flex items-start gap-1 text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />{" "}
          {address.filter(Boolean).join(", ") || "No address given"}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {phone ? (
            <a
              href={`tel:+${phone}`}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 font-medium text-primary-foreground"
            >
              <Phone className="size-4" aria-hidden /> Call {formatKePhone(phone)}
            </a>
          ) : null}
          <CallButton
            uid={pickup ? stop.farmer : stop.buyer}
            name={pickup ? stop.farmer_name : stop.buyer_name}
            orderId={stop.id}
            size="default"
          />
          {map ? (
            <a
              href={map}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border px-4 font-medium"
            >
              <MapPin className="size-4" aria-hidden /> Open map
            </a>
          ) : null}
        </div>
      </div>

      {canAct ? (
        <StopActionForm stop={stop} kind={kind} onDone={() => router.push("/driver" as Route)} />
      ) : doneAt ? (
        <p className="flex items-center gap-2 text-sm">
          <Badge variant="success">{pickup ? "Collected" : "Delivered"}</Badge>{" "}
          {formatDateTime(doneAt)}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {pickup ? "" : "Collect this produce from the farm first."}
        </p>
      )}

      {!pickup ? (
        <DeliveryChat
          orderId={stop.id}
          myRole="driver"
          otherName={stop.buyer_name}
          open={chatOpen}
        />
      ) : null}
      <Link
        href={"/driver" as Route}
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        Back to my trip
      </Link>
    </div>
  );
}
