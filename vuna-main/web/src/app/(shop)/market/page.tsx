import { Store } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Market",
  description: "Fresh produce from Kenyan farms, sold direct to hotels, retailers and wholesalers.",
};

// Placeholder until Module 3 builds the real market.
export default function MarketPage() {
  return (
    <section className="container-page grid gap-8 py-10">
      <PageHeader
        eyebrow="Market"
        title="Fresh from the farm"
        description="Browse produce listed by farmers across Kenya."
      />
      <EmptyState
        icon={Store}
        title="The market opens in the next update"
        description="Listings, search and filters are being built right now."
      />
    </section>
  );
}
