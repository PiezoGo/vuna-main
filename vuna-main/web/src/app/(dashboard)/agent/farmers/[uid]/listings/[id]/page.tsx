import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditListing } from "@/components/listings/edit-listing";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { UUID_PATTERN } from "@/lib/uuid";

export const metadata: Metadata = { title: "Edit listing" };

export default async function AgentEditListingPage({
  params,
}: {
  params: Promise<{ uid: string; id: string }>;
}) {
  const { uid, id } = await params;
  await requireUser(`/agent/farmers/${uid}/listings/${id}`, { roles: ["agent"] });
  const listingId = Number(id);
  if (!UUID_PATTERN.test(uid) || !Number.isSafeInteger(listingId) || listingId < 1) notFound();
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader eyebrow="Field agent" title="Edit listing" />
      <EditListing id={listingId} farmerUid={uid} backHref={`/agent/farmers/${uid}`} />
    </div>
  );
}
