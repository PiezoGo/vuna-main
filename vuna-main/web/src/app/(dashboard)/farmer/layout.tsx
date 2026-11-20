import type { Metadata } from "next";

import { ApprovalBanner } from "@/components/dashboard/approval-banner";
import { RoleArea } from "@/components/dashboard/role-area";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/farmer", { roles: ["farmer"] });
  return (
    <RoleArea role="farmer" user={user} banner={<ApprovalBanner user={user} />}>
      {children}
    </RoleArea>
  );
}
