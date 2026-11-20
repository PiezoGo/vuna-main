import { BarChart3, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ComingNext } from "@/components/dashboard/coming-next";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  // Layouts and pages render in parallel, so every page checks the role itself.
  await requireUser("/admin", { roles: ["admin"] });
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Operations overview"
        description="Orders, trips and payouts will appear here."
        actions={
          <Button asChild>
            <Link href="/admin/farmers">
              <UserCheck /> Farmer approvals
            </Link>
          </Button>
        }
      />
      <ComingNext
        icon={BarChart3}
        title="The operations dashboard is coming"
        description="For now, approve new farmers so their listings can go live."
      />
    </>
  );
}
