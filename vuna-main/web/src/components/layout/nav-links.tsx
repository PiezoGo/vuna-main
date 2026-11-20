"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { publicNav } from "@/config/nav";
import { cn } from "@/lib/utils";

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Public header links. Reads the config itself: nav items hold icon components, which can't be passed from a Server Component. */
export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  const items = publicNav;
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href as Route}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active && "text-foreground",
              )}
            >
              {item.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
