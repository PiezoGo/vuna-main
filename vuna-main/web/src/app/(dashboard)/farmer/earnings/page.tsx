import type { Metadata } from "next";

import { FarmerEarnings } from "@/components/dashboard/farmer-earnings";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Earnings" };

export default async function FarmerEarningsPage() {
  await requireUser("/farmer/earnings", { roles: ["farmer"] });
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Farmer" title="Earnings" />
      <FarmerEarnings />
    </div>
  );
}
