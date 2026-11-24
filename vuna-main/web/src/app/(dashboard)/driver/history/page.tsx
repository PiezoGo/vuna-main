import type { Metadata } from "next";

import { DriverTrips } from "@/components/delivery/driver-trips";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Past trips" };

export default async function DriverHistory() {
  await requireUser("/driver/history", { roles: ["driver"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Driver"
        title="Past trips"
        description="Your trips from the last 14 days."
      />
      <DriverTrips when="past" />
    </div>
  );
}
