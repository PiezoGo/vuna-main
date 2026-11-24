import type { Metadata } from "next";

import { NewTripForm } from "@/components/admin/new-trip-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Plan a trip" };

export default async function NewTripPage() {
  await requireUser("/admin/trips/new", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Trips"
        title="Plan a trip"
        description="Pick a date, tick the paid orders going the same way, and choose a driver."
      />
      <NewTripForm />
    </div>
  );
}
