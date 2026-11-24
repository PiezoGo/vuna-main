"use client";

import type { Order } from "@vuna/api";
import { PackageOpen } from "lucide-react";

import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminOrders } from "@/features/admin/ops-queries";
import { groupByArea } from "@/features/admin/steps";
import { formatKES } from "@/lib/format";

type Props = { date: string; selected: number[]; onToggle: (order: Order) => void };

/** Paid lines for the date that aren't on a trip yet, grouped by delivery area. */
export function TripOrderPicker({ date, selected, onToggle }: Props) {
  const { data, isPending, error } = useAdminOrders(
    { status: "paid", date, unscheduled: "true" },
    Boolean(date),
  );
  if (isPending) return <ListSkeleton rows={2} label="Loading paid orders" />;
  if (error) return <QueryError error={error} fallback="Couldn't load paid orders." />;
  if (data.length === 0)
    return (
      <EmptyState
        icon={PackageOpen}
        title="No paid orders waiting for this date"
        description="Orders appear here once the farmer has accepted and the buyer has paid."
      />
    );

  return (
    <div className="grid gap-4">
      {groupByArea(data).map(([area, lines]) => (
        <fieldset key={area} className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold">{area}</legend>
          {lines.map((order) => {
            const id = `pick-${order.id}`;
            const position = selected.indexOf(order.id);
            return (
              <label
                key={order.id}
                htmlFor={id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft"
              >
                <Checkbox
                  id={id}
                  checked={position >= 0}
                  onCheckedChange={() => onToggle(order)}
                  className="mt-0.5"
                />
                <span className="grid min-w-0 flex-1 gap-0.5 text-sm">
                  <span className="font-medium">
                    #{order.id} · {order.quantity} {order.product_unit} {order.product_title}
                  </span>
                  <span className="text-muted-foreground">
                    From {order.farmer_name}
                    {order.farmer_city ? ` (${order.farmer_city})` : ""} to {order.buyer_name}
                  </span>
                </span>
                <span className="text-sm font-medium">
                  {formatKES(order.total_price, { whole: true })}
                </span>
                {position >= 0 ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {position + 1}
                  </span>
                ) : null}
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
