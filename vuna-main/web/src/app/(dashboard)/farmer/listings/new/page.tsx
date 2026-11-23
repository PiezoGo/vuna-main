import type { Metadata } from "next";

import { ListingForm } from "@/components/listings/listing-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Add a listing" };

export default async function NewListingPage() {
  await requireUser("/farmer/listings/new", { roles: ["farmer"] });
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader eyebrow="Farmer" title="Add a listing" />
      <ListingForm backHref="/farmer/listings" />
    </div>
  );
}
