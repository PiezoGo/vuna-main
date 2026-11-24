"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { isActivePath } from "@/components/layout/nav-links";
import { NavBadge } from "@/components/notifications/nav-badge";
import { dashboardNav } from "@/config/nav";
import { useNotificationSummary } from "@/features/notifications/queries";
import type { Role } from "@/types/auth";
import { cn } from "@/lib/utils";

export function SidebarNav({
  role,
  className,
  onNavigate,
}: {
  role: Role;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = dashboardNav[role];
  const badges = useNotificationSummary(true).data?.badges ?? {};
  // The most specific matching item wins, so "/farmer/orders" doesn't also light up "/farmer".
  const activeHref = items
    .filter((item) => isActivePath(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Dashboard" className={className}>
      <ul className="grid gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href as Route}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {item.title}
                <NavBadge badge={badges[item.href]} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
