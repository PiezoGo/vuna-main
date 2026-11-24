import type { User } from "@vuna/api";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { Role } from "@/types/auth";

/** DashboardShell with the signed-in user's menu, for every role area's layout. */
export function RoleArea({
  role,
  user,
  banner,
  children,
}: {
  role: Role;
  user: User;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      role={role}
      topbarEnd={
        <>
          <NotificationBell />
          <UserMenu user={{ full_name: user.full_name, email: user.email, role: user.role }} />
        </>
      }
    >
      {banner}
      {children}
    </DashboardShell>
  );
}
