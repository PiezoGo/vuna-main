import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutDetail } from "@/components/order/checkout-detail";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`, { roles: ["buyer"] });
  const checkoutId = Number(id);
  if (!Number.isSafeInteger(checkoutId) || checkoutId < 1) notFound();
  return (
    <section className="container-page py-8 sm:py-10">
      <CheckoutDetail id={checkoutId} phone={user.phone_number} />
    </section>
  );
}
