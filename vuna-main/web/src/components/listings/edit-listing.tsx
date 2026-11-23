"use client";

import { ListingForm } from "@/components/listings/listing-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useListing } from "@/features/listings/queries";
import { ApiError } from "@/lib/api/errors";

/** Loads a listing (with the farmer's own price) and shows the edit form. */
export function EditListing({
  id,
  backHref,
  farmerUid,
}: {
  id: number;
  backHref: string;
  farmerUid?: string;
}) {
  const { data, isPending, error } = useListing(id);
  if (isPending) return <Skeleton className="h-96 rounded-2xl" />;
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError && error.status === 404
          ? "This listing doesn't exist."
          : "Couldn't load this listing."}
      </p>
    );
  }
  return <ListingForm product={data} backHref={backHref} farmerUid={farmerUid} />;
}
