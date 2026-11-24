"use client";

import { Inbox, Search } from "lucide-react";
import * as React from "react";

import { AdminOrderRow } from "@/components/admin/admin-order-row";
import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminOrders } from "@/features/admin/ops-queries";
import type { OrderFilters } from "@/features/admin/queries";
import { ORDER_STATUS } from "@/features/orders/status";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

const ALL = "all";

export function AdminOrders({ initial }: { initial: OrderFilters }) {
  const [filters, setFilters] = React.useState<OrderFilters>(initial);
  const [search, setSearch] = React.useState(initial.q ?? "");
  const setQuery = useDebouncedCallback(
    (q: string) => setFilters((f) => ({ ...f, q: q || undefined })),
    300,
  );
  const { data, isPending, error } = useAdminOrders(filters);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_180px]">
        <div className="grid gap-1.5">
          <Label htmlFor="order-search">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="order-search"
              className="pl-9"
              placeholder="Order #, product, farmer or buyer"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setQuery(e.target.value.trim());
              }}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="order-status">Status</Label>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v === ALL ? undefined : v }))}
          >
            <SelectTrigger id="order-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.entries(ORDER_STATUS).map(([value, info]) => (
                <SelectItem key={value} value={value}>
                  {info.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="order-date">Delivery date</Label>
          <Input
            id="order-date"
            type="date"
            value={filters.date ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value || undefined }))}
          />
        </div>
      </div>
      {filters.farmer || filters.buyer ? (
        <p className="text-sm text-muted-foreground">
          Showing one {filters.farmer ? "farmer" : "buyer"}&apos;s orders.{" "}
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline"
            onClick={() => setFilters((f) => ({ ...f, farmer: undefined, buyer: undefined }))}
          >
            Show everyone
          </button>
        </p>
      ) : null}
      {isPending ? (
        <ListSkeleton label="Loading orders" />
      ) : error ? (
        <QueryError error={error} fallback="Couldn't load orders." />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No orders match"
          description="Try another status or date."
        />
      ) : (
        <ul className="grid gap-3">
          {data.map((order) => (
            <AdminOrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
