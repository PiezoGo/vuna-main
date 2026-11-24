import { describe, expect, it } from "vitest";

import { liveEventSchema, reconnectDelay } from "@/features/realtime/events";

describe("liveEventSchema", () => {
  it("accepts a chat message event", () => {
    const parsed = liveEventSchema.safeParse({
      type: "message",
      partner: "abc",
      message: { id: 3, sender: "abc", order: null, message: "Habari" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown events", () => {
    expect(liveEventSchema.safeParse({ type: "nope" }).success).toBe(false);
  });
});

describe("reconnectDelay", () => {
  it("backs off then settles at 30 seconds", () => {
    expect([0, 1, 2, 3, 9].map(reconnectDelay)).toEqual([1000, 2000, 5000, 30000, 30000]);
  });
});
