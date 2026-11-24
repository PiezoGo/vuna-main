import { describe, expect, it } from "vitest";

import { nairobiDate, payoutCountdown } from "@/features/admin/time";

describe("nairobiDate", () => {
  it("uses Nairobi's calendar day", () => {
    // 22:30 UTC is 01:30 the next day in Nairobi (UTC+3).
    const now = new Date("2026-11-24T22:30:00Z");
    expect(nairobiDate(0, now)).toBe("2026-11-25");
    expect(nairobiDate(1, now)).toBe("2026-11-26");
  });
});

describe("payoutCountdown", () => {
  const now = new Date("2026-11-24T10:00:00Z");

  it("shows hours and minutes left", () => {
    expect(payoutCountdown("2026-11-24T12:05:00Z", now)).toEqual({
      label: "2h 05m left",
      overdue: false,
      urgent: false,
    });
  });

  it("is urgent under an hour", () => {
    expect(payoutCountdown("2026-11-24T10:30:00Z", now).urgent).toBe(true);
  });

  it("marks overdue", () => {
    expect(payoutCountdown("2026-11-24T09:15:00Z", now)).toEqual({
      label: "45m overdue",
      overdue: true,
      urgent: true,
    });
  });

  it("handles a missing due time", () => {
    expect(payoutCountdown(null, now).label).toBe("Not collected");
  });
});
