import type { Metadata } from "next";

import { UsersManager } from "@/components/admin/users-manager";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  await requireUser("/admin/users", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Find anyone, approve farmers, link farmers to a field agent, reset passwords and deactivate accounts. Accounts are never deleted, so their orders stay."
      />
      <UsersManager />
    </div>
  );
}
