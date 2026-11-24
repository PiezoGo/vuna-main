"use client";

import { MessageSquare, Phone, PhoneOff, Video } from "lucide-react";
import dynamic from "next/dynamic";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAcceptCall, useHangUp } from "@/features/calls/queries";
import { useCallStore } from "@/features/calls/store";
import { ApiError } from "@/lib/api/errors";
import { stopRingtone } from "@/lib/chime";
import { initials } from "@/lib/initials";
import { isRole, roleLabels } from "@/types/auth";

// livekit-client is only downloaded once a call is actually connecting.
const CallRoom = dynamic(() => import("@/components/call/call-room").then((m) => m.CallRoom), {
  ssr: false,
  loading: () => <p className="text-sm text-white/80">Connecting…</p>,
});

const RING_MS = 30_000;

/** Incoming call, outgoing ringing, the call itself and "call ended": over any page. */
export function CallOverlay() {
  const { phase, call, me, join, otherOnline, endedReason } = useCallStore();
  const accept = useAcceptCall();
  const hangUp = useHangUp();
  const other = call ? (me === "caller" ? call.callee : call.caller) : null;

  const finish = React.useCallback(
    (reason: string) => {
      stopRingtone();
      const state = useCallStore.getState();
      if (state.call) hangUp.mutate(state.call.id);
      state.end(reason);
    },
    [hangUp],
  );

  // The caller gives up after 30 seconds: the other person gets a missed call.
  React.useEffect(() => {
    if (phase !== "outgoing") return;
    const timer = setTimeout(() => finish("No answer"), RING_MS);
    return () => clearTimeout(timer);
  }, [phase, finish]);

  // "Call ended" closes itself after a moment.
  React.useEffect(() => {
    if (phase !== "ended") return;
    const timer = setTimeout(() => useCallStore.getState().reset(), 2_500);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "idle" || !call || !other) return null;
  const video = call.kind === "video";
  const role = isRole(other.role) ? roleLabels[other.role] : other.role;

  const onAccept = () => {
    stopRingtone();
    accept.mutate(call.id, {
      onSuccess: (data) => useCallStore.getState().joined({ url: data.url, token: data.token }),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't answer.");
        useCallStore.getState().reset();
      },
    });
  };

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="flex h-dvh max-h-dvh w-screen max-w-none flex-col items-center justify-between gap-6 rounded-none border-0 bg-foreground p-6 text-background sm:max-w-none [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="mt-10 grid justify-items-center gap-3 text-center">
          <span className="flex size-24 items-center justify-center rounded-full bg-primary text-3xl font-semibold">
            {initials(other.full_name)}
          </span>
          <DialogTitle className="text-2xl font-semibold text-white">{other.full_name}</DialogTitle>
          <DialogDescription className="text-white/75">
            {role}
            {call.order_title ? ` · ${call.order_title}` : ""}
            <br />
            {phase === "incoming" && (video ? "Incoming video call" : "Incoming call")}
            {phase === "outgoing" && "Ringing…"}
            {phase === "ended" && endedReason}
          </DialogDescription>
          {phase === "outgoing" && !otherOnline ? (
            <div className="mt-2 grid max-w-xs gap-2 rounded-xl bg-white/10 p-3 text-sm">
              <p>
                {other.full_name.split(" ")[0]} doesn&apos;t have VUNA open right now, so it may not
                ring.
              </p>
              <Link
                href={`/messages/${other.uid}` as Route}
                className="inline-flex items-center justify-center gap-1.5 font-medium underline"
                onClick={() => finish("Call cancelled")}
              >
                <MessageSquare className="size-4" /> Send a message instead
              </Link>
            </div>
          ) : null}
        </div>

        {phase === "active" && join ? (
          <CallRoom join={join} video={video} onLeave={(reason) => finish(reason)} />
        ) : null}

        <div className="mb-10 flex gap-10">
          {phase === "incoming" ? (
            <>
              <RoundButton
                label="Decline"
                tone="danger"
                onClick={() => {
                  stopRingtone();
                  finish("Call declined");
                }}
              >
                <PhoneOff />
              </RoundButton>
              <RoundButton
                label="Answer"
                tone="accept"
                loading={accept.isPending}
                onClick={onAccept}
              >
                {video ? <Video /> : <Phone />}
              </RoundButton>
            </>
          ) : phase === "outgoing" ? (
            <RoundButton label="Cancel" tone="danger" onClick={() => finish("Call cancelled")}>
              <PhoneOff />
            </RoundButton>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoundButton({
  label,
  tone,
  loading,
  onClick,
  children,
}: {
  label: string;
  tone: "danger" | "accept";
  loading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="grid justify-items-center gap-2 text-sm">
      <Button
        size="icon"
        aria-label={label}
        loading={loading}
        onClick={onClick}
        className={`size-16 rounded-full [&_svg]:size-7 ${tone === "danger" ? "bg-destructive hover:bg-destructive/90" : "bg-mpesa hover:bg-mpesa-hover"}`}
      >
        {children}
      </Button>
      {label}
    </span>
  );
}
