import { describe, expect, it } from "vitest";

import { marketHref, parseMarketSearch, toProductQuery } from "./search-params";

describe("market search params", () => {
  it("parses and falls back safely", () => {
    const s = parseMarketSearch({
      q: "  onion ",
      sort: "bogus",
      page: "-3",
      city: ["Limuru", "x"],
    });
    expect(s).toEqual({
      q: "onion",
      commodity: undefined,
      city: "Limuru",
      market: undefined,
      sort: "newest",
      page: 1,
    });
  });

  it("maps to the API query", () => {
    const q = toProductQuery(
      parseMarketSearch({ sort: "price_asc", page: "2", commodity: "kale" }),
    );
    expect(q).toMatchObject({
      ordering: "listed_price_per_unit",
      page: 2,
      page_size: 24,
      commodity: "kale",
    });
  });

  it("builds clean URLs", () => {
    expect(marketHref({ sort: "newest", page: 1 })).toBe("/market");
    expect(marketHref({ commodity: "kale", page: 2 })).toBe("/market?commodity=kale&page=2");
  });
});
