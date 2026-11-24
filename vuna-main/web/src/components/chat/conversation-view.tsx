"use client";

import { ArrowLeft, Send } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { CallButton } from "@/components/call/call-button";
import { QueryError } from "@/components/admin/query-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useConversation, useSendChat } from "@/features/chat/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isRole, roleLabels } from "@/types/auth";

export function ConversationView({ uid, myId }: { uid: string; myId: string }) {
  const { data, isPending, error } = useConversation(uid);
  const send = useSendChat(uid);
  const [text, setText] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);
  const count = data?.messages.length ?? 0;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const submit = () => {
    const message = text.trim();
    if (!message) return;
    send.mutate(message, {
      onSuccess: () => setText(""),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Message not sent. Try again."),
    });
  };

  if (isPending) return <Skeleton className="h-[60dvh] rounded-2xl" />;
  if (error) return <QueryError error={error} fallback="Couldn't open this conversation." />;
  const { partner, messages, can_send: canSend } = data;
  const lastMine = [...messages].reverse().find((m) => m.sender === myId);

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-96 flex-col overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          href={"/messages" as Route}
          aria-label="Back to messages"
          className="rounded-md p-1 hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="grid">
          <p className="font-semibold">{partner.full_name}</p>
          <p className="text-[12px] text-muted-foreground">
            {isRole(partner.role) ? roleLabels[partner.role] : partner.role}
            {partner.city ? ` · ${partner.city}` : ""}
          </p>
        </div>
        <CallButton uid={partner.uid} name={partner.full_name} className="ml-auto" />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Say hello to {partner.full_name.split(" ")[0]}.
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.sender === myId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%]",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <p className="break-words whitespace-pre-wrap">{m.message}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px]",
                    mine ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {m.order ? `Order #${m.order} · ` : ""}
                  {formatDateTime(m.timestamp)}
                  {mine && m.id === lastMine?.id && m.is_read ? " · Seen" : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {canSend ? (
        <form
          className="flex items-end gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <Textarea
            id="chat-input"
            rows={1}
            value={text}
            maxLength={2000}
            placeholder="Type a message"
            className="max-h-32 min-h-11 resize-none"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send"
            loading={send.isPending}
            disabled={!text.trim()}
          >
            <Send />
          </Button>
        </form>
      ) : (
        <p className="border-t p-3 text-center text-[13px] text-muted-foreground">
          You can no longer send messages here.
        </p>
      )}
    </div>
  );
}
