import type { Metadata } from "next";

import { IncomingOrders } from "@/components/dashboard/incoming-orders";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Orders" };

export default async function FarmerOrdersPage() {
  await requireUser("/farmer/orders", { roles: ["farmer"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Farmer"
        title="Orders"
        description="Accept the orders you can supply. Unanswered orders close after 2 hours."
      />
      <IncomingOrders />
    </div>
  );
}
