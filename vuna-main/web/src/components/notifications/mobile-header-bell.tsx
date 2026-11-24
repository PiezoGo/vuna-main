"use client";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { useSession } from "@/features/auth/queries";

/** The bell in the public header on phones (the desktop one sits in HeaderAuth). */
export function MobileHeaderBell() {
  const { data: user } = useSession();
  if (!user) return null;
  return (
    <div className="ml-auto md:hidden">
      <NotificationBell />
    </div>
  );
}
