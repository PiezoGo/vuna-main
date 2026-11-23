import type { BadgeProps } from "@/components/ui/badge";

type StatusInfo = { label: string; variant: NonNullable<BadgeProps["variant"]> };

export const ORDER_STATUS: Record<string, StatusInfo> = {
  pending: { label: "Waiting for farmer", variant: "warning" },
  accepted: { label: "Accepted", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
  expired: { label: "Expired", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "muted" },
  paid: { label: "Confirmed and paid", variant: "success" },
  assigned: { label: "Driver assigned", variant: "default" },
  collected: { label: "Collected", variant: "default" },
  in_transit: { label: "On the way", variant: "default" },
  delivered: { label: "Delivered", variant: "success" },
  completed: { label: "Completed", variant: "success" },
};

export const CHECKOUT_STATE: Record<string, StatusInfo & { help: string }> = {
  awaiting_farmers: {
    label: "Waiting for farmers",
    variant: "warning",
    help: "Farmers have up to 2 hours to confirm.",
  },
  awaiting_payment: {
    label: "Ready to pay",
    variant: "default",
    help: "Pay by M-Pesa to confirm your order.",
  },
  paid: {
    label: "Paid",
    variant: "success",
    help: "We'll schedule delivery for your chosen date.",
  },
  closed: { label: "Closed", variant: "muted", help: "Nothing left to deliver on this order." },
};

export function statusInfo(status: string): StatusInfo {
  return ORDER_STATUS[status] ?? { label: status, variant: "muted" };
}
