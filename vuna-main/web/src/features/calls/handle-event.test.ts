import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleCallEvent } from "@/features/calls/handle-event";
import { useCallStore } from "@/features/calls/store";
import type { CallInfo } from "@/features/realtime/events";

vi.mock("@/lib/chime", () => ({ startRingtone: vi.fn(), stopRingtone: vi.fn() }));

const call: CallInfo = {
  id: "c1",
  kind: "audio",
  status: "ringing",
  caller: { uid: "a", full_name: "Amina Buyer", role: "buyer" },
  callee: { uid: "b", full_name: "Wanjiku Farmer", role: "farmer" },
  order: 7,
  order_title: "10 kg Tomatoes",
};

describe("handleCallEvent", () => {
  beforeEach(() => useCallStore.getState().reset());

  it("rings, then closes when answered on another device", () => {
    handleCallEvent({ event: "incoming", call });
    expect(useCallStore.getState().phase).toBe("incoming");
    handleCallEvent({ event: "accepted", call });
    expect(useCallStore.getState().phase).toBe("idle");
  });

  it("connects the caller when the other person answers", () => {
    useCallStore.getState().startOutgoing(call, { url: "wss://x", token: "t" }, true);
    handleCallEvent({ event: "accepted", call });
    expect(useCallStore.getState().phase).toBe("active");
  });

  it("tells the caller the call was declined", () => {
    useCallStore.getState().startOutgoing(call, { url: "wss://x", token: "t" }, true);
    handleCallEvent({ event: "declined", call });
    expect(useCallStore.getState()).toMatchObject({ phase: "ended", endedReason: "Call declined" });
  });

  it("ignores events about other calls and a second ring while busy", () => {
    useCallStore.getState().startOutgoing(call, { url: "wss://x", token: "t" }, true);
    handleCallEvent({ event: "ended", call: { ...call, id: "other" } });
    handleCallEvent({ event: "incoming", call: { ...call, id: "c2" } });
    expect(useCallStore.getState()).toMatchObject({ phase: "outgoing", call: { id: "c1" } });
  });
});
