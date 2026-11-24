import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TripDetail } from "@/components/admin/trip-detail";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Trip" };

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/admin/trips/${id}`, { roles: ["admin"] });
  const tripId = Number(id);
  if (!Number.isSafeInteger(tripId) || tripId < 1) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Trips" title={`Trip #${tripId}`} />
      <TripDetail id={tripId} />
    </div>
  );
}
