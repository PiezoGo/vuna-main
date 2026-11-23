import { z } from "zod";

export const SORTS = [
  { value: "newest", label: "Newest", ordering: "-created_at" },
  { value: "price_asc", label: "Price: low to high", ordering: "listed_price_per_unit" },
  { value: "price_desc", label: "Price: high to low", ordering: "-listed_price_per_unit" },
] as const;

export type SortValue = (typeof SORTS)[number]["value"];

export const PAGE_SIZE = 24;

const text = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((v) => (v ? v : undefined));

const marketSearchSchema = z.object({
  q: text,
  commodity: text,
  city: text,
  market: text,
  sort: z.enum(["newest", "price_asc", "price_desc"]).catch("newest"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export type MarketSearch = z.infer<typeof marketSearchSchema>;

type RawParams = Record<string, string | string[] | undefined>;

/** Read the market's URL parameters safely: bad values fall back to defaults. */
export function parseMarketSearch(raw: RawParams): MarketSearch {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return marketSearchSchema.parse({
    q: first("q"),
    commodity: first("commodity"),
    city: first("city"),
    market: first("market"),
    sort: first("sort"),
    page: first("page"),
  });
}

/** The API query for a market search. */
export function toProductQuery(search: MarketSearch) {
  const sort = SORTS.find((s) => s.value === search.sort) ?? SORTS[0];
  return {
    search: search.q,
    commodity: search.commodity,
    city: search.city,
    market: search.market,
    ordering: sort.ordering,
    page: search.page,
    page_size: PAGE_SIZE,
  };
}

/** Build a /market URL, dropping defaults and empty values. */
export function marketHref(search: Partial<MarketSearch>): string {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  if (search.commodity) params.set("commodity", search.commodity);
  if (search.city) params.set("city", search.city);
  if (search.market) params.set("market", search.market);
  if (search.sort && search.sort !== "newest") params.set("sort", search.sort);
  if (search.page && search.page > 1) params.set("page", String(search.page));
  const query = params.toString();
  return query ? `/market?${query}` : "/market";
}

export function hasFilters(search: MarketSearch): boolean {
  return Boolean(search.q || search.commodity || search.city || search.market);
}
