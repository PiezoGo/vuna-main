import type { Metadata } from "next";

import { ProblemQueue } from "@/components/admin/problem-queue";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Problems" };

export default async function ProblemsPage() {
  await requireUser("/admin/problems", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Problems reported"
        description="Buyers report problems after delivery, with a photo. Compare with the driver's photos, call if needed, then refund or reject."
      />
      <ProblemQueue />
    </div>
  );
}
