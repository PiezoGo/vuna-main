import { Plus } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { TripList } from "@/components/admin/trip-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Trips" };

export default async function TripsPage() {
  await requireUser("/admin/trips", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Delivery trips"
        description="One driver, one date: farm pickups first, then buyer drop-offs."
        actions={
          <Button asChild>
            <Link href={"/admin/trips/new" as Route}>
              <Plus /> Plan a trip
            </Link>
          </Button>
        }
      />
      <TripList />
    </div>
  );
}
