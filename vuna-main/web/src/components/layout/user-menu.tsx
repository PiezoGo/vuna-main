"use client";

import type { User } from "@vuna/api";
import { KeyRound, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { roleHome, routes } from "@/config/routes";
import { useLogout } from "@/features/auth/queries";
import { isRole, roleLabels } from "@/types/auth";

type MenuUser = Pick<User, "full_name" | "email" | "role">;

export function UserMenu({ user }: { user: MenuUser }) {
  const logout = useLogout();
  const role = isRole(user.role) ? user.role : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex cursor-pointer items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={`Account menu for ${user.full_name}`}
      >
        <Avatar>
          <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="grid gap-1">
          <span className="truncate">{user.full_name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          {role ? <Badge className="mt-1">{roleLabels[role]}</Badge> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role ? (
          <DropdownMenuItem asChild>
            <Link href={roleHome[role] as Route}>
              <LayoutDashboard /> {role === "buyer" ? "Market" : "My dashboard"}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href={routes.profile as Route}>
            <UserRound /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.changePassword as Route}>
            <KeyRound /> Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onSelect={() => logout.mutate()}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
