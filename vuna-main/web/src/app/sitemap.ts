import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getAllProductRefs } from "@/lib/api/endpoints/catalog";
import { productPath } from "@/lib/slug";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const pages: MetadataRoute.Sitemap = ["", "/market", "/about", "/team", "/terms"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/market" ? "hourly" : "monthly",
    priority: path === "" ? 1 : path === "/market" ? 0.9 : 0.4,
  }));

  try {
    const products = await getAllProductRefs();
    return [
      ...pages,
      ...products.map((p) => ({
        url: `${base}${productPath(p)}`,
        lastModified: p.created_at,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    // A sitemap without products is better than none.
    console.error("[sitemap] could not load products", error);
    return pages;
  }
}
