import { Users } from "lucide-react";
import type { Metadata } from "next";

import { ComingNext } from "@/components/dashboard/coming-next";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Field agent" };

export default async function AgentHome() {
  // Layouts and pages render in parallel, so every page checks the role itself.
  await requireUser("/agent", { roles: ["agent"] });
  return (
    <>
      <PageHeader
        eyebrow="Field agent"
        title="My farmers"
        description="Farmers linked to you and their listings."
      />
      <ComingNext
        icon={Users}
        title="Managing farmers is coming soon"
        description="You'll add and update listings for the farmers you support."
      />
    </>
  );
}
