import type { Metadata } from "next";

import { AdminOrders } from "@/components/admin/admin-orders";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Orders" };

type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function AdminOrdersPage({ searchParams }: { searchParams: Search }) {
  await requireUser("/admin/orders", { roles: ["admin"] });
  const params = await searchParams;
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Orders"
        description="Every order line. Until the driver app arrives, mark lines collected, delivered and completed here; each step is recorded with your name and the time."
      />
      <AdminOrders
        initial={{
          status: one(params.status),
          date: one(params.date),
          farmer: one(params.farmer),
          buyer: one(params.buyer),
        }}
      />
    </div>
  );
}
