import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  await requireUser("/cart", { roles: ["buyer"] });
  return (
    <section className="container-page grid gap-8 py-8 sm:py-10">
      <PageHeader
        title="Your cart"
        description="Prices include delivery. Each farmer confirms their items."
      />
      <CartView />
    </section>
  );
}
