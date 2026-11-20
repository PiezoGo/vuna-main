import { describe, expect, it } from "vitest";

import { formatDate, formatKES } from "./format";

describe("formatKES", () => {
  it("formats DRF decimal strings as KSh", () => {
    expect(formatKES("3240.00")).toBe("KSh 3,240.00");
  });

  it("supports whole shillings", () => {
    expect(formatKES(1200.5, { whole: true })).toBe("KSh 1,201");
  });

  it("treats missing or invalid values as zero", () => {
    expect(formatKES(null)).toBe("KSh 0.00");
    expect(formatKES("abc")).toBe("KSh 0.00");
  });
});

describe("formatDate", () => {
  it("uses Nairobi time", () => {
    // 22:30 UTC is already the next day in Nairobi (UTC+3)
    expect(formatDate("2026-07-15T22:30:00Z")).toBe("16 Jul 2026");
  });

  it("returns an empty string for bad input", () => {
    expect(formatDate("not a date")).toBe("");
    expect(formatDate(null)).toBe("");
  });
});
