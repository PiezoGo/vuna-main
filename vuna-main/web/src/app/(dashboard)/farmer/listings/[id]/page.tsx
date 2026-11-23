import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditListing } from "@/components/listings/edit-listing";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/farmer/listings/${id}`, { roles: ["farmer"] });
  const listingId = Number(id);
  if (!Number.isSafeInteger(listingId) || listingId < 1) notFound();
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader eyebrow="Farmer" title="Edit listing" />
      <EditListing id={listingId} backHref="/farmer/listings" />
    </div>
  );
}
