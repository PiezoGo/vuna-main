import type { TripStop } from "@vuna/api";
import { MapPin, Phone } from "lucide-react";

import { OrderStepButton } from "@/components/admin/order-step-button";
import { Badge } from "@/components/ui/badge";
import { statusInfo } from "@/features/orders/status";
import { formatKePhone } from "@/lib/phone";

type Props = {
  stop: TripStop;
  kind: "pickup" | "dropoff";
  position: number;
  action?: React.ReactNode;
};

function PhoneLink({ phone }: { phone: string | null | undefined }) {
  if (!phone) return null;
  return (
    <a href={`tel:+${phone}`} className="inline-flex items-center gap-1 font-medium text-primary">
      <Phone className="size-3.5" aria-hidden /> {formatKePhone(phone)}
    </a>
  );
}

export function TripStopCard({ stop, kind, position, action }: Props) {
  const status = statusInfo(stop.status);
  const pickup = kind === "pickup";
  return (
    <li className="flex gap-3 rounded-2xl border bg-card p-4 shadow-soft">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
        {position}
      </span>
      <div className="grid min-w-0 flex-1 gap-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">
            {pickup ? stop.farmer_name : stop.contact_name || stop.buyer_name}
          </p>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p>
          {pickup ? "Collect" : "Deliver"} {stop.quantity} {stop.unit} {stop.product_title}{" "}
          <span className="text-muted-foreground">(order #{stop.id})</span>
        </p>
        <p className="flex items-start gap-1 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {pickup
            ? [stop.farmer_market, stop.farmer_city].filter(Boolean).join(", ") ||
              "Farm location not set"
            : [stop.details, stop.area, stop.landmark].filter(Boolean).join(", ")}
        </p>
        {!pickup && stop.contact_name ? (
          <p className="text-muted-foreground">For {stop.buyer_name}</p>
        ) : null}
        <PhoneLink phone={pickup ? stop.farmer_phone : stop.contact_phone} />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {pickup ? (
          stop.status === "assigned" ? (
            <OrderStepButton id={stop.id} status={stop.status} />
          ) : null
        ) : stop.status !== "assigned" ? (
          <OrderStepButton id={stop.id} status={stop.status} />
        ) : null}
        {action}
      </div>
    </li>
  );
}
