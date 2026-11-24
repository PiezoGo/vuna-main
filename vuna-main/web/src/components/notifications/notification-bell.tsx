"use client";

import { Bell, BellOff, CheckCheck, Volume2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkRead,
  useNotifications,
  useNotificationSummary,
} from "@/features/notifications/queries";
import { formatDateTime } from "@/lib/format";
import { isMuted, setMuted, subscribeMuted } from "@/lib/chime";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const summary = useNotificationSummary(true);
  const list = useNotifications(open);
  const markRead = useMarkRead();
  const muted = React.useSyncExternalStore(subscribeMuted, isMuted, () => false);
  const unread = summary.data?.unread ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={muted ? "Turn sound on" : "Mute sound"}
              title={muted ? "Sound off" : "Sound on"}
              onClick={(e) => {
                e.preventDefault();
                setMuted(!muted);
              }}
            >
              {muted ? <BellOff /> : <Volume2 />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mark all read"
              title="Mark all read"
              disabled={unread === 0}
              onClick={(e) => {
                e.preventDefault();
                markRead.mutate(undefined);
              }}
            >
              <CheckCheck />
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[min(26rem,70dvh)] overflow-y-auto py-1">
          {list.isPending ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : list.error ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">
              Couldn&apos;t load notifications.
            </p>
          ) : list.data.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing yet. We&apos;ll let you know.
            </p>
          ) : (
            list.data.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  "grid cursor-pointer gap-0.5 rounded-none px-3 py-2.5",
                  !n.read_at && "bg-primary-soft/60",
                )}
                onSelect={() => {
                  if (!n.read_at) markRead.mutate([n.id]);
                  if (n.link) router.push(n.link as Route);
                }}
              >
                <span className="flex items-start gap-2 text-sm font-medium">
                  {!n.read_at ? (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  ) : null}
                  {n.title}
                </span>
                {n.body ? (
                  <span className="text-[13px] text-muted-foreground">{n.body}</span>
                ) : null}
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
