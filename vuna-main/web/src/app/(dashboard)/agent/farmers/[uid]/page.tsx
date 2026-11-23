import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingsManager } from "@/components/listings/listings-manager";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { UUID_PATTERN } from "@/lib/uuid";

export const metadata: Metadata = { title: "Farmer listings" };

export default async function AgentFarmerPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  await requireUser(`/agent/farmers/${uid}`, { roles: ["agent"] });
  if (!UUID_PATTERN.test(uid)) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Field agent"
        title="Farmer's listings"
        description="Changes you make are recorded with your name."
      />
      <ListingsManager farmerUid={uid} basePath={`/agent/farmers/${uid}/listings`} />
    </div>
  );
}
