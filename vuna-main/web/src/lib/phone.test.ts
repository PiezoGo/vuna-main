import { describe, expect, it } from "vitest";

import { formatKePhone, normalizeKePhone } from "./phone";

describe("normalizeKePhone", () => {
  it("accepts the common Kenyan formats", () => {
    for (const raw of [
      "0712345678",
      "0712 345 678",
      "+254712345678",
      "254712345678",
      "712345678",
    ]) {
      expect(normalizeKePhone(raw)).toBe("254712345678");
    }
    expect(normalizeKePhone("0110123456")).toBe("254110123456");
  });

  it("rejects anything else", () => {
    for (const raw of ["", "12345", "0812345678", "+255712345678"]) {
      expect(normalizeKePhone(raw)).toBeNull();
    }
  });
});

describe("formatKePhone", () => {
  it("formats stored numbers for display", () => {
    expect(formatKePhone("254712345678")).toBe("0712 345 678");
    expect(formatKePhone("legacy")).toBe("legacy");
  });
});
