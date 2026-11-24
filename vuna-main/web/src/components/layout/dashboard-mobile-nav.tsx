"use client";

import { Menu } from "lucide-react";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { useNotificationSummary } from "@/features/notifications/queries";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { roleLabels, type Role } from "@/types/auth";

export function DashboardMobileNav({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  const badges = useNotificationSummary(true).data?.badges ?? {};
  const waiting = Object.values(badges).some((b) => b.count > 0);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative lg:hidden"
          aria-label={waiting ? "Open navigation (something is waiting)" : "Open navigation"}
        >
          <Menu className="size-5" />
          {waiting ? (
            <span
              className="absolute top-2 right-2 size-2 rounded-full bg-destructive"
              aria-hidden
            />
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="px-3">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex items-center gap-2 px-2">
          <Logo />
          <Badge className="mr-8 ml-auto">{roleLabels[role]}</Badge>
        </div>
        <SidebarNav role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
