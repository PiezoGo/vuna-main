import type { Metadata } from "next";

import { PayoutQueue } from "@/components/admin/payout-queue";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Farmer payouts" };

export default async function PayoutsPage() {
  await requireUser("/admin/payouts", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Farmer payouts"
        description="We promise farmers their 92% within 4 hours of collection. Send it by M-Pesa, then record the reference. Oldest first."
      />
      <PayoutQueue />
    </div>
  );
}
