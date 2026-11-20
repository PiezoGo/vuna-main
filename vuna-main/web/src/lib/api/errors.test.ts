import { describe, expect, it } from "vitest";

import { toApiError } from "./errors";

describe("toApiError", () => {
  it("reads the custom {error} shape", () => {
    const err = toApiError(400, { error: "Insufficient stock for this order." });
    expect(err.message).toBe("Insufficient stock for this order.");
    expect(err.status).toBe(400);
  });

  it("reads DRF {detail}", () => {
    expect(toApiError(401, { detail: "Invalid token." }).message).toBe("Invalid token.");
  });

  it("collects field errors and keeps a generic message", () => {
    const err = toApiError(400, {
      email: ["Enter a valid email address."],
      quantity: ["Must be at least 1."],
    });
    expect(err.field("email")).toBe("Enter a valid email address.");
    expect(err.field("quantity")).toBe("Must be at least 1.");
    expect(err.message).toBe("Please check the highlighted fields.");
  });

  it("falls back for empty or HTML bodies", () => {
    expect(toApiError(502, null).message).toMatch(/Something went wrong/);
    expect(toApiError(404, "").message).toMatch(/couldn't find/);
  });
});
