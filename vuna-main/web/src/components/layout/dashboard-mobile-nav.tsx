"use client";

import { Menu } from "lucide-react";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { roleLabels, type Role } from "@/types/auth";

export function DashboardMobileNav({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
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
