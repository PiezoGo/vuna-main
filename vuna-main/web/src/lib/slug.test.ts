import { describe, expect, it } from "vitest";

import { productIdFromSlug, productPath, slugify } from "./slug";

describe("slugs", () => {
  it("makes readable product paths", () => {
    expect(productPath({ id: 12, title: "Red Onions (90kg bag)" })).toBe(
      "/products/12-red-onions-90kg-bag",
    );
    expect(productPath({ id: 3, title: "!!!" })).toBe("/products/3");
    expect(slugify("Sukuma Wiki – Fresh")).toBe("sukuma-wiki-fresh");
  });

  it("reads the id back", () => {
    expect(productIdFromSlug("12-red-onions")).toBe(12);
    expect(productIdFromSlug("12")).toBe(12);
    expect(productIdFromSlug("red-onions")).toBeNull();
    expect(productIdFromSlug("0-x")).toBeNull();
  });
});
