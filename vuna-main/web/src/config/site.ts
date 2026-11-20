import { publicEnv } from "@/config/env";

export const siteConfig = {
  name: "VUNA",
  title: "VUNA: Fresh produce, straight from Kenyan farms",
  description:
    "VUNA connects Kenyan farmers directly with hotels, retailers and wholesalers. Fair farm-gate prices, reliable delivery, M-Pesa payments.",
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  locale: "en_KE",
  contactEmail: "hello@vuna.co.ke",
} as const;
