import type { Metadata } from "next";

import { FarmerApprovals } from "@/components/dashboard/farmer-approvals";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Farmer approvals" };

export default async function FarmerApprovalsPage() {
  // Layouts and pages render in parallel, so every page checks the role itself.
  await requireUser("/admin/farmers", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Farmer approvals"
        description="New farmers wait here until someone from VUNA has checked them. Their listings go live once approved."
      />
      <FarmerApprovals />
    </div>
  );
}
