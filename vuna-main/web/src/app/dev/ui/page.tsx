import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DesignSystemShowcase } from "./_components/design-system-showcase";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/** Dev-only preview of every design-system component. 404 in production. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DesignSystemShowcase />;
}
