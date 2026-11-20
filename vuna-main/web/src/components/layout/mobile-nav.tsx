"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { isActivePath } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { publicNav } from "@/config/nav";
import { roleHome, route, routes } from "@/config/routes";
import { useLogout, useSession } from "@/features/auth/queries";
import { isRole } from "@/types/auth";
import { cn } from "@/lib/utils";

export function MobileNav({ className }: { className?: string }) {
  const items = publicNav;
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="gap-6">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <Logo />
        <nav aria-label="Mobile">
          <ul className="grid gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href as Route}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium transition-colors hover:bg-accent",
                      active && "bg-primary-soft text-primary",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto grid gap-2">
          {user ? (
            <>
              <p className="px-1 text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.full_name}</span>
              </p>
              <Button variant="outline" size="lg" asChild>
                <Link
                  href={(isRole(user.role) ? roleHome[user.role] : routes.root) as Route}
                  onClick={() => setOpen(false)}
                >
                  {user.role === "buyer" ? "Go to the market" : "My dashboard"}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                loading={logout.isPending}
                onClick={() => logout.mutate()}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="lg" asChild>
                <Link href={route(routes.login)} onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button size="lg" asChild>
                <Link href={route(routes.signup)} onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
