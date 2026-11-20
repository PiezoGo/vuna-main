import { describe, expect, it } from "vitest";

import { changePasswordSchema, signupSchema } from "./schemas";

const base = {
  role: "farmer" as const,
  full_name: "Wanjiku Kamau",
  email: "w@example.com",
  phone_number: "0712 345 678",
  password: "Harvest-2026",
  city: "Limuru",
};

describe("signupSchema", () => {
  it("accepts a valid farmer", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it("requires a business type for buyers", () => {
    const result = signupSchema.safeParse({ ...base, role: "buyer" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["buyer_type"]);
  });

  it("rejects bad phones and numeric-only passwords", () => {
    expect(signupSchema.safeParse({ ...base, phone_number: "123" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...base, password: "12345678" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("requires the confirmation to match", () => {
    const result = changePasswordSchema.safeParse({
      current_password: "x",
      new_password: "Harvest-2026",
      confirm_password: "Harvest-2027",
    });
    expect(result.error?.issues[0]?.path).toEqual(["confirm_password"]);
  });
});
