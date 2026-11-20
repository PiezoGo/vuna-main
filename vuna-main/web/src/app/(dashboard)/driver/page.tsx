import { Truck } from "lucide-react";
import type { Metadata } from "next";

import { ComingNext } from "@/components/dashboard/coming-next";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Driver" };

export default async function DriverHome() {
  // Layouts and pages render in parallel, so every page checks the role itself.
  await requireUser("/driver", { roles: ["driver"] });
  return (
    <>
      <PageHeader
        eyebrow="Driver"
        title="Today's trip"
        description="Your pickups and drop-offs will appear here."
      />
      <ComingNext
        icon={Truck}
        title="Trips are coming soon"
        description="Once an admin assigns you a trip, you'll see each stop here in order."
      />
    </>
  );
}
