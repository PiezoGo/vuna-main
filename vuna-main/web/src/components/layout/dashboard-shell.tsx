import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { DashboardMobileNav } from "@/components/layout/dashboard-mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { roleHome } from "@/config/routes";
import { roleLabels, type Role } from "@/types/auth";

type DashboardShellProps = {
  role: Role;
  /** Right side of the top bar (user menu, notifications). Filled in by Module 2. */
  topbarEnd?: React.ReactNode;
  children: React.ReactNode;
};

/** Workspace layout for farmer, driver and admin dashboards: sidebar on desktop, drawer on mobile. */
export function DashboardShell({ role, topbarEnd, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <Link href={roleHome[role] as Route} aria-label="Dashboard home">
            <Logo />
          </Link>
          <Badge className="ml-auto">{roleLabels[role]}</Badge>
        </div>
        <SidebarNav role={role} className="flex-1 px-3 py-4" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <DashboardMobileNav role={role} />
          <Link href={roleHome[role] as Route} className="lg:hidden" aria-label="Dashboard home">
            <Logo withWordmark={false} markClassName="size-8" />
          </Link>
          <div className="ml-auto flex items-center gap-2">{topbarEnd}</div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
