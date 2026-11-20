import type { Metadata } from "next";

import { RoleArea } from "@/components/dashboard/role-area";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/agent", { roles: ["agent"] });
  return (
    <RoleArea role="agent" user={user}>
      {children}
    </RoleArea>
  );
}
