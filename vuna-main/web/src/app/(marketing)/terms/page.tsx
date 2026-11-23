import type { Metadata } from "next";

import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "How buying and selling on VUNA works.",
};

// Draft: to be replaced by legally reviewed terms and a privacy policy before the pilot (PRD open question Q8).
export default function TermsPage() {
  return (
    <ProsePage
      eyebrow="Terms"
      title="Terms of use"
      intro="Draft for review. Last updated 23 November 2026."
    >
      <h2>1. Accounts</h2>
      <p>
        Farmers and buyers register with accurate details. New farmer accounts are checked by VUNA
        before their listings are shown to buyers. VUNA is for businesses; it does not sell to
        households.
      </p>
      <h2>2. Prices and fees</h2>
      <p>
        Farmers set their own price. The price buyers see includes delivery. VUNA keeps an 8%
        platform fee from the farmer&apos;s share; the farmer receives 92% of their asking price.
      </p>
      <h2>3. Orders</h2>
      <p>
        Farmers may accept or decline an order. If a buyer has already paid for an item that is
        declined, the buyer is refunded for it.
      </p>
      <h2>4. Delivery and quality</h2>
      <p>
        VUNA collects produce from the farm and delivers it to the buyer. Buyers can report a
        problem with a delivery within 24 hours, with a photo, and VUNA will decide on a refund.
      </p>
      <h2>5. Payments</h2>
      <p>Buyers pay by M-Pesa. Farmers are paid by M-Pesa after VUNA collects their produce.</p>
      <h2>6. Privacy</h2>
      <p>
        VUNA shows your phone number only to signed-in users who need it to trade with you. A full
        privacy policy will be published here.
      </p>
    </ProsePage>
  );
}
