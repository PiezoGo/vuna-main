import type { Order } from "@vuna/api";
import { Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { OrderStepButton } from "@/components/admin/order-step-button";
import { Badge } from "@/components/ui/badge";
import { statusInfo } from "@/features/orders/status";
import { formatDate, formatKES } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

export function AdminOrderRow({ order }: { order: Order }) {
  const status = statusInfo(order.status);
  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">#{order.id}</span>
          <p className="font-semibold">
            {order.quantity} {order.product_unit} {order.product_title}
          </p>
          <Badge variant={status.variant}>{status.label}</Badge>
          {order.refunded ? <Badge variant="destructive">Refunded</Badge> : null}
          {order.farmer_paid ? <Badge variant="success">Farmer paid</Badge> : null}
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            Farmer: {order.farmer_name}{" "}
            <a
              className="inline-flex items-center gap-0.5 hover:text-foreground"
              href={`tel:+${order.farmer_phone}`}
            >
              <Phone className="size-3" aria-hidden /> {formatKePhone(order.farmer_phone)}
            </a>
          </span>
          <span>Buyer: {order.buyer_name}</span>
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {order.delivery_date ? <span>Delivery {formatDate(order.delivery_date)}</span> : null}
          {order.delivery_area ? <span>{order.delivery_area}</span> : null}
          {order.driver_name ? <span>Driver: {order.driver_name}</span> : null}
          {order.trip ? (
            <Link
              className="text-primary underline-offset-2 hover:underline"
              href={`/admin/trips/${order.trip}` as Route}
            >
              Trip #{order.trip}
            </Link>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        <p className="font-semibold">{formatKES(order.total_price)}</p>
        <OrderStepButton id={order.id} status={order.status} />
      </div>
    </li>
  );
}
