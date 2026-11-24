"use client";

import type { StaffCredentials } from "@vuna/api";
import { Phone, Plus, Truck } from "lucide-react";
import * as React from "react";

import { ActiveToggleButton } from "@/components/admin/active-toggle-button";
import { AddStaffDialog } from "@/components/admin/add-staff-dialog";
import { OneTimePasswordDialog } from "@/components/admin/one-time-password-dialog";
import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminUsers } from "@/features/admin/user-queries";
import { formatKePhone } from "@/lib/phone";

export function DriversManager() {
  const { data, isPending, error } = useAdminUsers({ role: "driver" });
  const [adding, setAdding] = React.useState(false);
  const [credentials, setCredentials] = React.useState<StaffCredentials | null>(null);

  return (
    <div className="grid gap-5">
      <div>
        <Button onClick={() => setAdding(true)}>
          <Plus /> Add a driver
        </Button>
      </div>
      {isPending ? (
        <ListSkeleton label="Loading drivers" />
      ) : error ? (
        <QueryError error={error} fallback="Couldn't load drivers." />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No drivers yet"
          description="Add your first driver to start planning trips."
        />
      ) : (
        <ul className="grid gap-3">
          {data.map((driver) => (
            <li
              key={driver.uid}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:items-center"
            >
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{driver.full_name}</p>
                  {driver.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="muted">Deactivated</Badge>
                  )}
                  {driver.must_change_password ? (
                    <Badge variant="warning">Hasn&apos;t signed in yet</Badge>
                  ) : null}
                </div>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <a
                    href={`tel:+${driver.phone_number}`}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Phone className="size-3.5" aria-hidden /> {formatKePhone(driver.phone_number)}
                  </a>
                  {driver.vehicle_type ? <span>{driver.vehicle_type}</span> : null}
                  <span className="break-all">{driver.email}</span>
                </p>
              </div>
              <ActiveToggleButton user={driver} />
            </li>
          ))}
        </ul>
      )}
      <AddStaffDialog
        role="driver"
        open={adding}
        onOpenChange={setAdding}
        onCreated={setCredentials}
      />
      <OneTimePasswordDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
