import { describe, expect, it } from "vitest";

import { productImages, stockLabel, unitLabel } from "./product";

describe("product helpers", () => {
  it("keeps only http image URLs", () => {
    expect(
      productImages({ images: ["https://a/b.jpg", null, 3, "javascript:x", "http://c/d.png"] }),
    ).toEqual(["https://a/b.jpg", "http://c/d.png"]);
    expect(productImages({ images: undefined })).toEqual([]);
  });

  it("labels units and stock", () => {
    expect(unitLabel("sack", 2)).toBe("sacks");
    expect(stockLabel({ quantity: 1200, unit: "kg" })).toBe("1,200 kg available");
    expect(stockLabel({ quantity: 0, unit: "kg" })).toBe("Sold out");
  });
});
