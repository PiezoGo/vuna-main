"use client";

import { create } from "zustand";

/** Whether the live connection is up (UI state only: polling slows down while it is). */
type LiveState = { connected: boolean; setConnected: (connected: boolean) => void };

export const useLiveStore = create<LiveState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
