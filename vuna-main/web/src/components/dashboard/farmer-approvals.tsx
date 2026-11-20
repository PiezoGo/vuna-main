"use client";

import type { ApprovalStatus, FarmerApproval } from "@vuna/api";
import { Check, Inbox, Phone, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { RejectFarmerDialog } from "@/components/dashboard/reject-farmer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApproveFarmer, useFarmers } from "@/features/admin/queries";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

const TABS: { value: ApprovalStatus; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
];

export function FarmerApprovals() {
  return (
    <Tabs defaultValue="pending">
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((t) => (
        <TabsContent key={t.value} value={t.value}>
          <FarmerList status={t.value} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function FarmerList({ status }: { status: ApprovalStatus }) {
  const { data, isPending, error } = useFarmers(status);

  if (isPending) {
    return (
      <div className="grid gap-3" aria-label="Loading farmers">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Couldn't load farmers."}
      </p>
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={status === "pending" ? "No one is waiting" : "Nothing here yet"}
        description={status === "pending" ? "New farmer sign-ups will appear here." : undefined}
      />
    );
  }
  return (
    <ul className="grid gap-3">
      {data.map((farmer) => (
        <FarmerRow key={farmer.uid} farmer={farmer} />
      ))}
    </ul>
  );
}

function FarmerRow({ farmer }: { farmer: FarmerApproval }) {
  const approve = useApproveFarmer();
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const onApprove = () =>
    approve.mutate(farmer.uid, {
      onSuccess: () => toast.success(`${farmer.full_name} approved`),
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : "Couldn't approve. Try again."),
    });

  return (
    <li className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{farmer.full_name}</p>
          {farmer.cooperative_name ? (
            <Badge variant="outline">{farmer.cooperative_name}</Badge>
          ) : null}
          <Badge variant="muted">
            {farmer.listings} listing{farmer.listings === 1 ? "" : "s"}
          </Badge>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <a
            href={`tel:+${farmer.phone_number}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Phone className="size-3.5" aria-hidden /> {formatKePhone(farmer.phone_number)}
          </a>
          <span>{farmer.email}</span>
          {farmer.city ? <span>{farmer.city}</span> : null}
          <span>Joined {formatDate(farmer.date_joined)}</span>
        </p>
        {farmer.approval_status === "rejected" && farmer.rejection_reason ? (
          <p className="text-sm text-destructive">Declined: {farmer.rejection_reason}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        {farmer.approval_status !== "approved" ? (
          <Button onClick={onApprove} loading={approve.isPending}>
            <Check /> Approve
          </Button>
        ) : null}
        {farmer.approval_status !== "rejected" ? (
          <Button variant="outline" onClick={() => setRejectOpen(true)}>
            <X /> Decline
          </Button>
        ) : null}
      </div>
      <RejectFarmerDialog farmer={farmer} open={rejectOpen} onOpenChange={setRejectOpen} />
    </li>
  );
}
