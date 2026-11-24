"use client";

import * as React from "react";

import { useSession } from "@/features/auth/queries";
import { useNotificationSummary } from "@/features/notifications/queries";
import { useLiveConnection } from "@/features/realtime/use-live-connection";

/** Mounted once for the whole site: the live connection and "(3) VUNA" in the tab title. */
export function LiveConnection() {
  const { data: user } = useSession();
  useLiveConnection(user?.uid ?? null);
  const { data } = useNotificationSummary(Boolean(user));
  const waiting = user && data ? data.unread + data.messages : 0;

  React.useEffect(() => {
    const strip = (title: string) => title.replace(/^\(\d+\+?\) /, "");
    const apply = () => {
      const base = strip(document.title);
      const next = waiting > 0 ? `(${waiting > 99 ? "99+" : waiting}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    // Next.js sets the title on every navigation; put the count back when it does.
    const head = document.querySelector("head");
    if (!head) return;
    const observer = new MutationObserver(apply);
    observer.observe(head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [waiting]);

  return null;
}
