import { useCallStore } from "@/features/calls/store";
import type { CallInfo } from "@/features/realtime/events";
import { startRingtone, stopRingtone } from "@/lib/chime";

type CallEvent = {
  event: "incoming" | "accepted" | "declined" | "missed" | "ended";
  call: CallInfo;
};

const REASONS: Record<string, string> = {
  declined: "Call declined",
  missed: "No answer",
  ended: "Call ended",
};

/** Apply a live call event to this tab's call state (ringing, answered elsewhere, hung up…). */
export function handleCallEvent({ event, call }: CallEvent): void {
  const state = useCallStore.getState();
  const mine = state.call?.id === call.id;

  if (event === "incoming") {
    if (state.phase === "idle" || state.phase === "ended") {
      state.ringIncoming(call);
      startRingtone();
    }
    return;
  }
  if (!mine || state.phase === "ended") return;
  stopRingtone();

  if (event === "accepted") {
    // The caller joins now. A callee tab that didn't answer (another tab or device) closes.
    if (state.me === "caller" && state.phase === "outgoing") state.connect();
    else if (state.me === "callee" && state.phase === "incoming") state.reset();
    return;
  }
  if (state.me === "callee" && state.phase === "incoming") {
    state.reset(); // the caller gave up, or another tab declined
    return;
  }
  if (state.phase !== "idle") state.end(REASONS[event] ?? "Call ended");
}
