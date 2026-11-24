"use client";

import type { StaffCredentials } from "@vuna/api";
import { Plus, Search, Users } from "lucide-react";
import * as React from "react";

import { AddStaffDialog } from "@/components/admin/add-staff-dialog";
import { OneTimePasswordDialog } from "@/components/admin/one-time-password-dialog";
import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { UserRow } from "@/components/admin/user-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserFilters } from "@/features/admin/queries";
import { useAdminUsers } from "@/features/admin/user-queries";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { roleLabels } from "@/types/auth";

const ALL = "all";
const PENDING = "pending-farmers";

export function UsersManager() {
  const [filters, setFilters] = React.useState<UserFilters>({});
  const [search, setSearch] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [credentials, setCredentials] = React.useState<StaffCredentials | null>(null);
  const setQuery = useDebouncedCallback(
    (q: string) => setFilters((f) => ({ ...f, q: q || undefined })),
    300,
  );
  const { data, isPending, error } = useAdminUsers(filters);
  const agents = useAdminUsers({ role: "agent" });
  const agentNames = new Map((agents.data ?? []).map((a) => [a.uid, a.full_name]));
  const roleValue = filters.approval === "pending" ? PENDING : (filters.role ?? ALL);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAdding(true)}>
          <Plus /> Add a field agent
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="grid gap-1.5">
          <Label htmlFor="user-search">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="user-search"
              className="pl-9"
              placeholder="Name, email or phone"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setQuery(e.target.value.trim());
              }}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="user-role">Show</Label>
          <Select
            value={roleValue}
            onValueChange={(v) =>
              setFilters((f) => ({
                q: f.q,
                role: v === ALL ? undefined : v === PENDING ? "farmer" : v,
                approval: v === PENDING ? "pending" : undefined,
              }))
            }
          >
            <SelectTrigger id="user-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Everyone</SelectItem>
              <SelectItem value={PENDING}>Farmers to approve</SelectItem>
              {Object.entries(roleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isPending ? (
        <ListSkeleton label="Loading users" />
      ) : error ? (
        <QueryError error={error} fallback="Couldn't load users." />
      ) : data.length === 0 ? (
        <EmptyState icon={Users} title="No one matches" description="Try another name or filter." />
      ) : (
        <ul className="grid gap-3">
          {data.map((user) => (
            <UserRow
              key={user.uid}
              user={user}
              agentName={user.agent ? agentNames.get(user.agent) : undefined}
              onCredentials={setCredentials}
            />
          ))}
        </ul>
      )}
      <AddStaffDialog
        role="agent"
        open={adding}
        onOpenChange={setAdding}
        onCreated={setCredentials}
      />
      <OneTimePasswordDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
