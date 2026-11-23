import type { Metadata } from "next";

import { ListingsManager } from "@/components/listings/listings-manager";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My listings" };

export default async function FarmerListingsPage() {
  await requireUser("/farmer/listings", { roles: ["farmer"] });
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Farmer"
        title="My listings"
        description="Set your price; buyers see it with delivery added."
      />
      <ListingsManager basePath="/farmer/listings" />
    </div>
  );
}
