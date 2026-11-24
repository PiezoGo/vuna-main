import type { TripStatus } from "@vuna/api";

import { Badge, type BadgeProps } from "@/components/ui/badge";

const TRIP_STATUS: Record<
  TripStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  planned: { label: "Planned", variant: "default" },
  in_progress: { label: "On the road", variant: "warning" },
  done: { label: "Done", variant: "success" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const info = TRIP_STATUS[status];
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
