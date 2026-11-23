import type { Metadata } from "next";

import { FarmerOverview } from "@/components/dashboard/farmer-overview";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Farmer dashboard" };

export default async function FarmerHome() {
  const user = await requireUser("/farmer", { roles: ["farmer"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Farmer"
        title={`Habari, ${user.full_name.split(" ")[0]}`}
        description="Your orders, listings and earnings at a glance."
      />
      <FarmerOverview />
    </div>
  );
}
