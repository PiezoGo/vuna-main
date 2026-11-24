import type { Metadata } from "next";

import { RefundQueue } from "@/components/admin/refund-queue";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Refunds" };

export default async function RefundsPage() {
  await requireUser("/admin/refunds", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Refunds to send"
        description="Buyers paid for these lines but won't receive them. Send the money back by M-Pesa, then record the reference."
      />
      <RefundQueue />
    </div>
  );
}
