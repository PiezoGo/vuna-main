"use client";

import type { Problem } from "@vuna/api";
import { Phone, ShieldCheck } from "lucide-react";
import * as React from "react";

import { DecideProblemDialog } from "@/components/admin/decide-problem-dialog";
import { ListSkeleton, QueryError } from "@/components/admin/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProblems, type ProblemFilter } from "@/features/admin/problem-queries";
import { formatDateTime, formatKES } from "@/lib/format";
import { formatKePhone } from "@/lib/phone";

export function ProblemQueue() {
  const [status, setStatus] = React.useState<ProblemFilter>("open");
  const { data, isPending, error } = useProblems(status);
  return (
    <div className="grid gap-5">
      <Tabs value={status} onValueChange={(v) => setStatus(v as ProblemFilter)}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="refunded">Refunded</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>
      {isPending ? (
        <ListSkeleton label="Loading problems" />
      ) : error ? (
        <QueryError error={error} fallback="Couldn't load problems." />
      ) : data.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={status === "open" ? "No open problems" : "Nothing here"}
        />
      ) : (
        <ul className="grid gap-3">
          {data.map((p) => (
            <ProblemRow key={p.id} problem={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Photo({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="size-24 rounded-xl border object-cover" />
    </a>
  );
}

function ProblemRow({ problem: p }: { problem: Problem }) {
  const [open, setOpen] = React.useState(false);
  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{p.reason_label}</p>
        <span className="text-sm text-muted-foreground">
          Order #{p.order} · {p.quantity} {p.unit} {p.product_title} ·{" "}
          {formatDateTime(p.created_at)}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{p.description}</p>
      <div className="flex flex-wrap gap-2">
        <Photo src={p.photo} alt="Buyer's photo" />
        <Photo src={p.delivery_photo} alt="Driver's delivery photo" />
        <Photo src={p.pickup_photo} alt="Driver's pickup photo" />
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          Buyer: {p.buyer_name}{" "}
          <a
            href={`tel:+${p.buyer_phone}`}
            className="inline-flex items-center gap-0.5 text-primary"
          >
            <Phone className="size-3" aria-hidden /> {formatKePhone(p.buyer_phone)}
          </a>
        </span>
        <span>Farmer: {p.farmer_name}</span>
        <span>Paid {formatKES(p.total_price)}</span>
        <span>
          Farmer share {formatKES(p.farmer_earnings)} (
          {p.farmer_paid ? "already paid out" : "not paid out yet"})
        </span>
      </p>
      {p.status === "open" ? (
        <div>
          <Button size="sm" onClick={() => setOpen(true)}>
            Decide
          </Button>
          <DecideProblemDialog problem={p} open={open} onOpenChange={setOpen} />
        </div>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={p.status === "refunded" ? "success" : "muted"}>
            {p.status === "refunded" ? `Refund ${formatKES(p.refund_amount)}` : "Rejected"}
          </Badge>
          {p.fault ? <span>{p.fault === "farmer" ? "Farmer's fault" : "VUNA's fault"}</span> : null}
          {Number(p.farmer_deduction) > 0 ? (
            <span>Farmer deduction {formatKES(p.farmer_deduction)}</span>
          ) : null}
          <span className="text-muted-foreground">
            {p.decided_by_name} · {formatDateTime(p.decided_at)} · {p.admin_note}
          </span>
        </p>
      )}
    </li>
  );
}
