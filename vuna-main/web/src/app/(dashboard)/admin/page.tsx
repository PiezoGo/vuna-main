import { ClipboardList, Truck } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { AdminOverview } from "@/components/admin/admin-overview";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  // Layouts and pages render in parallel, so every page checks the role itself.
  await requireUser("/admin", { roles: ["admin"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Today"
        description="What needs doing now: trips to plan, farmers to pay and refunds to send."
        actions={
          <>
            <Button asChild>
              <Link href={"/admin/trips/new" as Route}>
                <Truck /> Plan a trip
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={"/admin/orders" as Route}>
                <ClipboardList /> All orders
              </Link>
            </Button>
          </>
        }
      />
      <AdminOverview />
    </div>
  );
}
