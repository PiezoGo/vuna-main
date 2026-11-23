import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingForm } from "@/components/listings/listing-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { UUID_PATTERN } from "@/lib/uuid";

export const metadata: Metadata = { title: "Add a listing" };

export default async function AgentNewListingPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  await requireUser(`/agent/farmers/${uid}/listings/new`, { roles: ["agent"] });
  if (!UUID_PATTERN.test(uid)) notFound();
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader eyebrow="Field agent" title="Add a listing for this farmer" />
      <ListingForm farmerUid={uid} backHref={`/agent/farmers/${uid}`} />
    </div>
  );
}
