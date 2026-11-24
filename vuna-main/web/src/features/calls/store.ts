"use client";

import { create } from "zustand";

import type { CallInfo } from "@/features/realtime/events";

export type CallPhase = "idle" | "outgoing" | "incoming" | "active" | "ended";
export type JoinInfo = { url: string; token: string };

type CallState = {
  phase: CallPhase;
  call: CallInfo | null;
  /** "caller" or "callee" for the person using this tab. */
  me: "caller" | "callee" | null;
  join: JoinInfo | null;
  otherOnline: boolean;
  endedReason: string | null;
  startOutgoing: (call: CallInfo, join: JoinInfo, otherOnline: boolean) => void;
  ringIncoming: (call: CallInfo) => void;
  joined: (join: JoinInfo) => void;
  connect: () => void;
  end: (reason: string) => void;
  reset: () => void;
};

const initial = {
  phase: "idle" as const,
  call: null,
  me: null,
  join: null,
  otherOnline: true,
  endedReason: null,
};

/** The one call this tab is part of (UI state only). */
export const useCallStore = create<CallState>((set) => ({
  ...initial,
  startOutgoing: (call, join, otherOnline) =>
    set({ phase: "outgoing", call, me: "caller", join, otherOnline, endedReason: null }),
  ringIncoming: (call) =>
    set({ phase: "incoming", call, me: "callee", join: null, endedReason: null }),
  joined: (join) => set({ phase: "active", join }),
  connect: () => set({ phase: "active" }),
  end: (reason) => set({ phase: "ended", endedReason: reason }),
  reset: () => set(initial),
}));
