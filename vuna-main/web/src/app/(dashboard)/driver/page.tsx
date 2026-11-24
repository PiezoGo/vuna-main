import type { Metadata } from "next";

import { DriverTrips } from "@/components/delivery/driver-trips";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My trips" };

export default async function DriverHome() {
  // Layouts and pages render in parallel, so every page checks the role itself.
  const user = await requireUser("/driver", { roles: ["driver"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Driver"
        title={`Habari, ${user.full_name.split(" ")[0]}`}
        description="Collect from each farm in order, then deliver. Take a photo at every stop."
      />
      <DriverTrips when="upcoming" />
    </div>
  );
}
