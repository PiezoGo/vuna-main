import type { Metadata } from "next";

import { RoleArea } from "@/components/dashboard/role-area";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/admin", { roles: ["admin"] });
  return (
    <RoleArea role="admin" user={user}>
      {children}
    </RoleArea>
  );
}
