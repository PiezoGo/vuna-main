"use client";

import type { Call } from "@vuna/api";
import { Phone, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCallCheck, useStartCall } from "@/features/calls/queries";
import { useCallStore } from "@/features/calls/store";
import type { CallInfo } from "@/features/realtime/events";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type Props = {
  uid: string | null | undefined;
  name: string;
  orderId?: number | null;
  size?: "sm" | "default";
  className?: string;
};

function toInfo(call: Call): CallInfo {
  return {
    ...call,
    caller: { ...call.caller },
    callee: { ...call.callee },
    order: call.order ?? null,
    order_title: null,
  };
}

/** "Call" and "Video" buttons. Hidden when calls aren't set up or this person can't be called. */
export function CallButton({ uid, name, orderId, size = "sm", className }: Props) {
  const check = useCallCheck(uid);
  const start = useStartCall();
  const busy = useCallStore((s) => s.phase !== "idle" && s.phase !== "ended");
  if (!uid || !check.data?.enabled || !check.data.allowed) return null;

  const call = (kind: "audio" | "video") =>
    start.mutate(
      { callee: uid, kind, order: orderId ?? null },
      {
        onSuccess: (join) =>
          useCallStore
            .getState()
            .startOutgoing(
              toInfo(join.call),
              { url: join.url, token: join.token },
              join.callee_online,
            ),
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Couldn't start the call."),
      },
    );

  return (
    <span className={cn("inline-flex gap-1.5", className)}>
      <Button
        size={size}
        variant="outline"
        disabled={busy}
        loading={start.isPending && start.variables?.kind === "audio"}
        onClick={() => call("audio")}
        aria-label={`Call ${name}`}
      >
        <Phone /> Call
      </Button>
      <Button
        size={size === "sm" ? "icon-sm" : "icon"}
        variant="outline"
        disabled={busy}
        onClick={() => call("video")}
        aria-label={`Video call ${name}`}
        title="Video call"
      >
        <Video />
      </Button>
    </span>
  );
}
