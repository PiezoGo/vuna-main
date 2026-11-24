"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { publicEnv } from "@/config/env";
import { chatKeys } from "@/features/chat/queries";
import { deliveryKeys } from "@/features/delivery/queries";
import { notificationKeys } from "@/features/notifications/queries";
import { liveEventSchema, reconnectDelay, type LiveEvent } from "@/features/realtime/events";
import { useLiveStore } from "@/features/realtime/store";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";
import { playChime } from "@/lib/chime";

const PING_EVERY = 25_000;

/**
 * One live connection per signed-in tab. Gets a one-time ticket through our proxy, connects
 * straight to Django (Vercel can't forward websockets), reconnects with backoff, and turns
 * events into cache refreshes, a toast and a chime. Without NEXT_PUBLIC_WS_URL it does nothing
 * and the queries fall back to checking every 60 seconds.
 */
export function useLiveConnection(userId: string | null) {
  const queryClient = useQueryClient();
  const setConnected = useLiveStore((s) => s.setConnected);
  const pathname = usePathname();
  const pathRef = React.useRef(pathname);
  React.useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const handle = React.useCallback(
    (event: LiveEvent) => {
      switch (event.type) {
        case "badges":
          void queryClient.invalidateQueries({ queryKey: notificationKeys.summary });
          break;
        case "notification":
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
          toast(event.notification.title, { description: event.notification.body || undefined });
          playChime();
          break;
        case "message": {
          void queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
          void queryClient.invalidateQueries({ queryKey: chatKeys.conversation(event.partner) });
          if (event.message.order) {
            void queryClient.invalidateQueries({
              queryKey: deliveryKeys.messages(event.message.order),
            });
          }
          const fromOther = event.message.sender === event.partner;
          if (fromOther && pathRef.current !== `/messages/${event.partner}`) playChime();
          break;
        }
        case "read":
          void queryClient.invalidateQueries({ queryKey: chatKeys.conversation(event.partner) });
          break;
        default:
          break;
      }
    },
    [queryClient],
  );

  React.useEffect(() => {
    const base = publicEnv.NEXT_PUBLIC_WS_URL;
    if (!userId || !base) return;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;

    const scheduleRetry = () => {
      if (stopped) return;
      retry = setTimeout(connect, reconnectDelay(attempt));
      attempt += 1;
    };

    async function connect() {
      try {
        const { ticket } = await unwrap(clientApi.POST("/api/realtime/ticket/"));
        if (stopped) return;
        socket = new WebSocket(`${base}?ticket=${encodeURIComponent(ticket)}`);
      } catch (error) {
        console.warn("[live] couldn't get a ticket; retrying", error);
        scheduleRetry();
        return;
      }
      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
        // Catch up on anything missed while disconnected.
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        void queryClient.invalidateQueries({ queryKey: chatKeys.all });
        ping = setInterval(() => socket?.send(JSON.stringify({ type: "ping" })), PING_EVERY);
      };
      socket.onmessage = (message) => {
        try {
          const parsed = liveEventSchema.safeParse(JSON.parse(String(message.data)));
          if (parsed.success) handle(parsed.data);
        } catch (error) {
          console.warn("[live] ignored a malformed event", error);
        }
      };
      socket.onclose = () => {
        clearInterval(ping);
        setConnected(false);
        scheduleRetry();
      };
    }

    void connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(ping);
      setConnected(false);
      socket?.close();
    };
  }, [userId, handle, queryClient, setConnected]);
}
