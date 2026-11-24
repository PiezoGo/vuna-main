import type { Metadata } from "next";

import { DriversManager } from "@/components/admin/drivers-manager";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Drivers" };

export default async function DriversPage() {
  await requireUser("/admin/drivers", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Drivers"
        description="Add drivers with a one-time password; they choose their own at first sign-in. Deactivate anyone who has left: their past trips stay."
      />
      <DriversManager />
    </div>
  );
}
