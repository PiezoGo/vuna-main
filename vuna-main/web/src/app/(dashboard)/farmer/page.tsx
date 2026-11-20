import { Sprout } from "lucide-react";
import type { Metadata } from "next";

import { ComingNext } from "@/components/dashboard/coming-next";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Farmer dashboard" };

export default async function FarmerHome() {
  const user = await requireUser("/farmer", { roles: ["farmer"] });
  return (
    <>
      <PageHeader
        eyebrow="Farmer"
        title={`Habari, ${user.full_name.split(" ")[0]}`}
        description="Your listings, orders and payouts will live here."
      />
      <ComingNext
        icon={Sprout}
        title="Listings and orders are coming next"
        description="You'll add produce, accept orders and track your M-Pesa payouts from this page."
      />
    </>
  );
}
