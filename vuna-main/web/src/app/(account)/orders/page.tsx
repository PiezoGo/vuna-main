import type { Metadata } from "next";

import { CheckoutList } from "@/components/order/checkout-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  await requireUser("/orders", { roles: ["buyer"] });
  return (
    <section className="container-page grid gap-8 py-8 sm:py-10">
      <PageHeader title="My orders" description="Farmers' answers appear here as they come in." />
      <CheckoutList />
    </section>
  );
}
