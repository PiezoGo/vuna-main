import type { TripStop } from "@vuna/api";
import { ChevronRight, MapPin, Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { mapsUrl } from "@/features/delivery/maps";
import { statusInfo } from "@/features/orders/status";
import { formatKePhone } from "@/lib/phone";

type Props = { stop: TripStop; kind: "pickup" | "dropoff"; position: number };

/** One numbered stop on the driver's trip: who, where, call, map and a link to act on it. */
export function DriverStopRow({ stop, kind, position }: Props) {
  const pickup = kind === "pickup";
  const done = pickup ? Boolean(stop.collected_at) : Boolean(stop.delivered_at);
  const phone = pickup ? stop.farmer_phone : stop.contact_phone;
  const address = pickup
    ? [stop.farmer_market, stop.farmer_city]
    : [stop.details, stop.area, stop.landmark];
  const map = mapsUrl(address);
  const status = statusInfo(stop.status);
  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done ? "bg-success-soft text-success" : "bg-primary text-primary-foreground"}`}
        >
          {position}
        </span>
        <div className="grid min-w-0 flex-1 gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">
              {pickup ? stop.farmer_name : stop.contact_name || stop.buyer_name}
            </p>
            <Badge variant={done ? "success" : status.variant}>
              {done ? (pickup ? "Collected" : "Delivered") : status.label}
            </Badge>
          </div>
          <p>
            {pickup ? "Collect" : "Deliver"} {stop.quantity} {stop.unit} {stop.product_title}
          </p>
          <p className="flex items-start gap-1 text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {address.filter(Boolean).join(", ") || "No address given"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {phone ? (
          <a
            href={`tel:+${phone}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            <Phone className="size-4" aria-hidden /> {formatKePhone(phone)}
          </a>
        ) : null}
        {map ? (
          <a
            href={map}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            <MapPin className="size-4" aria-hidden /> Map
          </a>
        ) : null}
        <Link
          href={`/driver/stops/${stop.id}?kind=${kind}` as Route}
          className="ml-auto inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {done ? "Details" : pickup ? "Collect" : "Deliver"}{" "}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </li>
  );
}
