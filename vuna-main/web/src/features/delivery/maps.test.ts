import { describe, expect, it } from "vitest";

import { mapsUrl } from "@/features/delivery/maps";

describe("mapsUrl", () => {
  it("joins the address parts and adds Kenya", () => {
    expect(mapsUrl(["Gate 2", " Westlands ", null, ""])).toBe(
      "https://www.google.com/maps/search/?api=1&query=Gate%202%2C%20Westlands%2C%20Kenya",
    );
  });

  it("returns null without an address", () => {
    expect(mapsUrl([null, " "])).toBeNull();
  });
});
