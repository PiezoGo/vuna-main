"use client";

import { MessageSquare, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeliveryMessages, useSendMessage } from "@/features/delivery/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { orderId: number; myRole: "driver" | "buyer"; otherName: string; open: boolean };

/** The chat about one delivery between the trip's driver and the buyer. Refreshes every 15 s. */
export function DeliveryChat({ orderId, myRole, otherName, open }: Props) {
  const { data, isPending, error } = useDeliveryMessages(orderId);
  const send = useSendMessage(orderId);
  const [text, setText] = React.useState("");
  const endRef = React.useRef<HTMLLIElement>(null);
  const count = data?.length ?? 0;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [count]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    send.mutate(message, {
      onSuccess: () => setText(""),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Message not sent. Try again."),
    });
  };

  return (
    <section
      className="grid gap-3 rounded-2xl border bg-card p-4"
      aria-label={`Chat with ${otherName}`}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquare className="size-4 text-primary" aria-hidden /> Chat with {otherName}
      </h3>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading messages…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Couldn't load messages."}
        </p>
      ) : (
        <ul className="grid max-h-72 gap-2 overflow-y-auto" aria-live="polite">
          {data.length === 0 ? (
            <li className="text-sm text-muted-foreground">No messages yet.</li>
          ) : (
            data.map((m) => {
              const mine = m.sender_role === myRole;
              return (
                <li
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{m.message}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[11px]",
                      mine ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {mine ? "You" : m.sender_name} · {formatDateTime(m.timestamp)}
                  </p>
                </li>
              );
            })
          )}
          <li ref={endRef} aria-hidden />
        </ul>
      )}
      {open ? (
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor={`chat-${orderId}`} className="sr-only">
            Message
          </label>
          <Input
            id={`chat-${orderId}`}
            value={text}
            maxLength={1000}
            placeholder="Type a message"
            onChange={(e) => setText(e.target.value)}
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
        <p className="text-[13px] text-muted-foreground">
          This delivery is finished, so the chat is closed.
        </p>
      )}
    </section>
  );
}
