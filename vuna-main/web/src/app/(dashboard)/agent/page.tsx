import type { Metadata } from "next";

import { AgentFarmers } from "@/components/dashboard/agent-farmers";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My farmers" };

export default async function AgentHome() {
  await requireUser("/agent", { roles: ["agent"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Field agent"
        title="My farmers"
        description="Manage listings for the farmers you support. Their earnings always go to their own M-Pesa."
      />
      <AgentFarmers />
    </div>
  );
}
