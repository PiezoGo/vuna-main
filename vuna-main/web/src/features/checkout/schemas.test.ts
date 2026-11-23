import { describe, expect, it } from "vitest";

import { addressSchema, earliestDeliveryDate } from "./schemas";

describe("checkout schemas", () => {
  it("validates addresses", () => {
    const ok = addressSchema.safeParse({
      label: "Kitchen",
      contact_name: "Chef",
      contact_phone: "0711 000 222",
      area: "Westlands",
      details: "Back gate",
    });
    expect(ok.success).toBe(true);
    expect(
      addressSchema.safeParse({
        label: "K",
        contact_name: "",
        contact_phone: "1",
        area: "",
        details: "",
      }).success,
    ).toBe(false);
  });

  it("uses Nairobi's date for tomorrow", () => {
    // 22:30 UTC on 23 Nov is already 24 Nov in Nairobi, so tomorrow is 25 Nov.
    expect(earliestDeliveryDate(new Date("2026-11-23T22:30:00Z"))).toBe("2026-11-25");
    expect(earliestDeliveryDate(new Date("2026-11-23T08:00:00Z"))).toBe("2026-11-24");
  });
});
