"use client";

import type { Order } from "@vuna/api";
import { Check, MessageSquare, TriangleAlert } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { CallButton } from "@/components/call/call-button";
import { DeliveryChat } from "@/components/delivery/delivery-chat";
import { ReportProblemDialog } from "@/components/order/report-problem-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDelivery } from "@/features/delivery/queries";
import { ApiError } from "@/lib/api/errors";
import { formatKES } from "@/lib/format";

const ON_THE_WAY = ["assigned", "collected", "in_transit", "delivered"];

/** Delivery photo, "Confirm received", "Report a problem" and the chat with the driver. */
export function DeliveryActions({ line }: { line: Order }) {
  const confirm = useConfirmDelivery();
  const [reporting, setReporting] = React.useState(false);
  const [chatting, setChatting] = React.useState(false);
  const problem = line.problem;
  const delivered = line.status === "delivered";
  const canChat = Boolean(line.trip) && ON_THE_WAY.includes(line.status);
  if (!delivered && !canChat && !problem && !line.delivery_photo) return null;

  return (
    <div className="grid gap-3 border-t border-dashed pt-3">
      {line.delivery_photo ? (
        <a href={line.delivery_photo} target="_blank" rel="noreferrer" className="w-fit">
          {/* Cloudinary photo taken by the driver; shown as-is. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={line.delivery_photo}
            alt="Photo taken at delivery"
            className="h-28 rounded-xl border object-cover"
          />
        </a>
      ) : null}
      {problem ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge
            variant={
              problem.status === "open"
                ? "warning"
                : problem.status === "refunded"
                  ? "success"
                  : "muted"
            }
          >
            {problem.status === "open"
              ? "Problem reported"
              : problem.status === "refunded"
                ? `Refund of ${formatKES(problem.refund_amount)} agreed`
                : "Problem reviewed, no refund"}
          </Badge>
          {problem.admin_note && problem.status !== "open" ? (
            <span className="text-muted-foreground">VUNA: {problem.admin_note}</span>
          ) : null}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {delivered && !problem ? (
          <>
            <Button
              size="sm"
              variant="mpesa"
              loading={confirm.isPending}
              onClick={() =>
                confirm.mutate(line.id, {
                  onSuccess: () => toast.success("Thanks! Delivery confirmed."),
                  onError: (e) =>
                    toast.error(e instanceof ApiError ? e.message : "Couldn't confirm. Try again."),
                })
              }
            >
              <Check /> Confirm received
            </Button>
            <Button size="sm" variant="outline" onClick={() => setReporting(true)}>
              <TriangleAlert /> Report a problem
            </Button>
          </>
        ) : null}
        {canChat ? (
          <CallButton
            uid={line.driver}
            name={line.driver_name ?? "your driver"}
            orderId={line.id}
          />
        ) : null}
        {canChat ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setChatting((v) => !v)}
            aria-expanded={chatting}
          >
            <MessageSquare /> {chatting ? "Hide chat" : "Chat with the driver"}
          </Button>
        ) : null}
      </div>
      {chatting && canChat ? (
        <DeliveryChat
          orderId={line.id}
          myRole="buyer"
          otherName={line.driver_name ?? "your driver"}
          open
        />
      ) : null}
      <ReportProblemDialog line={line} open={reporting} onOpenChange={setReporting} />
    </div>
  );
}
