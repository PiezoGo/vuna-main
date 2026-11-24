import type { Badge } from "@vuna/api";

import { cn } from "@/lib/utils";

/** The count pill on a sidebar tab: red when something is late, brown otherwise. */
export function NavBadge({ badge, className }: { badge: Badge | undefined; className?: string }) {
  if (!badge || badge.count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-none font-semibold",
        badge.urgent
          ? "bg-destructive text-destructive-foreground"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      <span aria-hidden>{badge.count > 99 ? "99+" : badge.count}</span>
      <span className="sr-only">{badge.count} waiting</span>
    </span>
  );
}
