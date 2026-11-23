import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout", { roles: ["buyer"] });
  return (
    <section className="container-page grid gap-8 py-8 sm:py-10">
      <PageHeader
        title="Checkout"
        description="Where and when should we deliver, and how would you like to pay?"
      />
      <CheckoutForm phone={user.phone_number} />
    </section>
  );
}
