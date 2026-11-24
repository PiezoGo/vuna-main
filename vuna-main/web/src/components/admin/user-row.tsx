"use client";

import type { StaffCredentials, User } from "@vuna/api";
import { Check, Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { ActiveToggleButton } from "@/components/admin/active-toggle-button";
import { LinkAgentDialog } from "@/components/admin/link-agent-dialog";
import { errorMessage } from "@/components/admin/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApproveFarmer } from "@/features/admin/queries";
import { useResetPassword } from "@/features/admin/user-queries";
import { formatDate } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";
import { roleLabels, type Role } from "@/types/auth";

type Props = { user: User; agentName?: string; onCredentials: (c: StaffCredentials) => void };

export function UserRow({ user, agentName, onCredentials }: Props) {
  const approve = useApproveFarmer();
  const reset = useResetPassword();
  const [linking, setLinking] = React.useState(false);
  const isFarmer = user.role === "farmer";
  const ordersHref = isFarmer
    ? `/admin/orders?farmer=${user.uid}`
    : user.role === "buyer"
      ? `/admin/orders?buyer=${user.uid}`
      : null;

  const onReset = () => {
    if (
      !window.confirm(
        `Issue a new one-time password for ${user.full_name}? Their old password stops working.`,
      )
    )
      return;
    reset.mutate(user.uid, {
      onSuccess: onCredentials,
      onError: (error) => toast.error(errorMessage(error, "Couldn't reset the password.")),
    });
  };

  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{user.full_name}</p>
          <Badge variant="outline">{roleLabels[user.role as Role] ?? user.role}</Badge>
          {!user.is_active ? <Badge variant="muted">Deactivated</Badge> : null}
          {isFarmer && user.approval_status === "pending" ? (
            <Badge variant="warning">Waiting for approval</Badge>
          ) : null}
          {isFarmer && user.approval_status === "rejected" ? (
            <Badge variant="destructive">Declined</Badge>
          ) : null}
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <a
            href={`tel:+${user.phone_number}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Phone className="size-3.5" aria-hidden /> {formatKePhone(user.phone_number)}
          </a>
          <span className="break-all">{user.email}</span>
          {user.city ? <span>{user.city}</span> : null}
          {user.cooperative_name ? <span>{user.cooperative_name}</span> : null}
          <span>Joined {formatDate(user.date_joined)}</span>
        </p>
        {isFarmer ? (
          <p className="text-sm text-muted-foreground">
            Field agent: {agentName ?? (user.agent ? "Linked" : "None")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {isFarmer && user.approval_status !== "approved" ? (
          <Button
            size="sm"
            loading={approve.isPending}
            onClick={() =>
              approve.mutate(user.uid, {
                onSuccess: () => toast.success(`${user.full_name} approved`),
                onError: (error) => toast.error(errorMessage(error, "Couldn't approve.")),
              })
            }
          >
            <Check /> Approve
          </Button>
        ) : null}
        {isFarmer ? (
          <Button size="sm" variant="outline" onClick={() => setLinking(true)}>
            Field agent
          </Button>
        ) : null}
        {ordersHref ? (
          <Button size="sm" variant="outline" asChild>
            <Link href={ordersHref as Route}>Orders</Link>
          </Button>
        ) : null}
        {user.role !== "admin" ? (
          <Button size="sm" variant="outline" onClick={onReset} loading={reset.isPending}>
            Reset password
          </Button>
        ) : null}
        <ActiveToggleButton user={user} />
      </div>
      {isFarmer ? <LinkAgentDialog farmer={user} open={linking} onOpenChange={setLinking} /> : null}
    </li>
  );
}
