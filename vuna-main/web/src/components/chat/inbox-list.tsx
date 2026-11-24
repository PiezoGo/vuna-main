"use client";

import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useInbox } from "@/features/chat/queries";
import { formatDateTime } from "@/lib/format";
import { initials } from "@/lib/initials";
import { roleLabels, isRole } from "@/types/auth";

export function InboxList({ myId }: { myId: string }) {
  const { data, isPending, error } = useInbox();
  if (isPending) return <ListSkeleton rows={4} label="Loading conversations" />;
  if (error) return <QueryError error={error} fallback="Couldn't load your messages." />;
  if (data.length === 0)
    return (
      <EmptyState
        icon={MessageSquare}
        title="No messages yet"
        description="Message a farmer from their profile or a product page. Delivery chats with your driver appear here too."
      />
    );
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-soft">
      {data.map(({ partner, last_message: last, unread }) => (
        <li key={partner.uid}>
          <Link
            href={`/messages/${partner.uid}` as Route}
            className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-muted focus-visible:bg-muted"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {initials(partner.full_name)}
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex items-center gap-2">
                <span className={`truncate ${unread ? "font-semibold" : "font-medium"}`}>
                  {partner.full_name}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {isRole(partner.role) ? roleLabels[partner.role] : partner.role}
                </span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                  {formatDateTime(last.timestamp)}
                </span>
              </span>
              <span
                className={`truncate text-sm ${unread ? "text-foreground" : "text-muted-foreground"}`}
              >
                {last.sender === myId ? "You: " : ""}
                {last.message}
              </span>
            </span>
            {unread ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {unread}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
