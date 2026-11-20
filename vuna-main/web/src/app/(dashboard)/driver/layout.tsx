import type { Metadata } from "next";

import { RoleArea } from "@/components/dashboard/role-area";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/driver", { roles: ["driver"] });
  return (
    <RoleArea role="driver" user={user}>
      {children}
    </RoleArea>
  );
}
