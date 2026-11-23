"use client";

import type { Product } from "@vuna/api";
import { Eye, EyeOff, Package, Pencil, Plus, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { toast } from "sonner";

import { ProductImage } from "@/components/product/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { productImages, stockLabel, unitLabel } from "@/features/catalog/product";
import { useMyListings, useRemoveListing, useSetListingActive } from "@/features/listings/queries";
import { ApiError } from "@/lib/api/errors";
import { formatKES } from "@/lib/format";

function statusOf(p: Product): { label: string; variant: "success" | "muted" | "warning" } {
  if (!p.is_active) return { label: "Paused", variant: "muted" };
  if (p.quantity <= 0) return { label: "Sold out", variant: "warning" };
  return { label: "Live", variant: "success" };
}

/** A farmer's listings with actions. `basePath` is where the listing pages live (/farmer/listings or an agent's). */
export function ListingsManager({ farmerUid, basePath }: { farmerUid?: string; basePath: string }) {
  const { data, isPending, error } = useMyListings(farmerUid);
  const setActive = useSetListingActive();
  const remove = useRemoveListing();

  const fail = (e: unknown) =>
    toast.error(e instanceof ApiError ? e.message : "Couldn't save. Try again.");

  if (isPending) return <Skeleton className="h-64 rounded-2xl" />;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Couldn't load listings."}
      </p>
    );

  const addButton = (
    <Button asChild>
      <Link href={`${basePath}/new` as Route}>
        <Plus /> Add a listing
      </Link>
    </Button>
  );

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No listings yet"
        description="Add your first produce so buyers can order it."
        action={addButton}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">{addButton}</div>
      <ul className="divide-y rounded-2xl border bg-card shadow-soft">
        {data.map((p) => {
          const status = statusOf(p);
          const [cover] = productImages(p);
          return (
            <li key={p.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <ProductImage
                src={cover}
                alt={p.title}
                sizes="72px"
                className="size-18 shrink-0 rounded-xl"
              />
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{p.title}</p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your price {formatKES(p.base_price_per_unit)} · buyers pay{" "}
                  {formatKES(p.listed_price_per_unit)} / {unitLabel(p.unit)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stockLabel(p)} · you receive {formatKES(p.farmer_earnings_per_unit)} per{" "}
                  {unitLabel(p.unit)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${basePath}/${p.id}` as Route}>
                    <Pencil /> Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setActive.mutate(
                      { id: p.id, active: !p.is_active },
                      {
                        onSuccess: () =>
                          toast.success(p.is_active ? "Paused: hidden from buyers" : "Live again"),
                        onError: fail,
                      },
                    )
                  }
                >
                  {p.is_active ? <EyeOff /> : <Eye />} {p.is_active ? "Pause" : "Show"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Remove "${p.title}"? Past orders are kept.`)) {
                      remove.mutate(p.id, {
                        onSuccess: () => toast.success("Listing removed"),
                        onError: fail,
                      });
                    }
                  }}
                >
                  <Trash2 /> Remove
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
