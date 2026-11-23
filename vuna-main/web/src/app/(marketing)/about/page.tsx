import type { Metadata } from "next";

import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "VUNA connects Kenyan farmers directly with hotels, retailers and wholesalers, with published prices and fast M-Pesa payment.",
};

export default function AboutPage() {
  return (
    <ProsePage
      eyebrow="About"
      title="Harvest more. Waste less. Earn more."
      intro="VUNA is a farm-to-business marketplace built in Kenya."
    >
      <p>
        Every harvest, good food rots at the farm gate because farmers can&apos;t reliably reach
        buyers, and the buyers they do reach are middlemen who set the price. Hotels, shops and
        wholesalers face the other side of the same problem: they can&apos;t find or trust
        individual farmers, and supply is inconsistent.
      </p>
      <h2>How VUNA works</h2>
      <p>
        Farmers list their produce at their own price. Buyers see that price, plus delivery, and
        nothing hidden. VUNA collects from the farm with trained drivers and insulated bags,
        delivers to the business, and pays the farmer by M-Pesa.
      </p>
      <h2>A middleman hides the price. VUNA publishes it.</h2>
      <p>
        Farmers keep 92% of their asking price. VUNA&apos;s 8% fee and the delivery charge are shown
        openly, so everyone knows where the money goes.
      </p>
    </ProsePage>
  );
}
