import "server-only";

import type { Product } from "@vuna/api";

import { toProductQuery, type MarketSearch } from "@/features/catalog/search-params";
import { ApiError } from "@/lib/api/errors";
import { unwrap } from "@/lib/api/result";
import { publicApi, serverApi } from "@/lib/api/server";

/** Public, cookie-free catalogue reads (safe for cached pages). */
export function getMarketProducts(search: MarketSearch) {
  return unwrap(publicApi().GET("/api/products/", { params: { query: toProductQuery(search) } }));
}

export function getLatestProducts(count: number) {
  return unwrap(
    publicApi().GET("/api/products/", {
      params: { query: { page_size: count, ordering: "-created_at" } },
    }),
  );
}

/** A product, or null when it doesn't exist or isn't public. */
export async function getProduct(id: number): Promise<Product | null> {
  try {
    return await unwrap(publicApi().GET("/api/products/{id}/", { params: { path: { id } } }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function getFacets() {
  return unwrap(publicApi().GET("/api/products/facets/"));
}

/** Every live product id + title, for the sitemap. Stops after 50 pages. */
export async function getAllProductRefs(): Promise<Pick<Product, "id" | "title" | "created_at">[]> {
  const refs: Pick<Product, "id" | "title" | "created_at">[] = [];
  for (let page = 1; page <= 50; page++) {
    const data = await unwrap(
      publicApi().GET("/api/products/", { params: { query: { page, page_size: 100 } } }),
    );
    refs.push(...data.results.map(({ id, title, created_at }) => ({ id, title, created_at })));
    if (!data.next) break;
  }
  return refs;
}

/** A farmer's profile for signed-in users (uses the session cookie). Null if not found. */
export async function getFarmerProfile(uid: string) {
  try {
    return await unwrap(
      (await serverApi()).GET("/api/profile/{uid}/", { params: { path: { uid } } }),
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}
