import type { User } from "@vuna/api";
import { Clock, XCircle } from "lucide-react";

/** Tells a farmer their account is waiting for VUNA's check, or why it was declined. */
export function ApprovalBanner({
  user,
}: {
  user: Pick<User, "approval_status" | "rejection_reason">;
}) {
  if (user.approval_status === "approved") return null;
  const rejected = user.approval_status === "rejected";
  const Icon = rejected ? XCircle : Clock;
  return (
    <div
      role="status"
      className={
        rejected
          ? "mb-6 flex gap-3 rounded-xl border border-destructive/20 bg-destructive-soft p-4 text-sm text-destructive"
          : "mb-6 flex gap-3 rounded-xl border border-warning/20 bg-warning-soft p-4 text-sm text-warning"
      }
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="grid gap-1">
        <p className="font-semibold">
          {rejected ? "Your account wasn't approved" : "Waiting for approval"}
        </p>
        <p className="text-foreground/80">
          {rejected
            ? `Reason: ${user.rejection_reason || "not given"}. Contact VUNA support if you think this is a mistake.`
            : "The VUNA team checks every new farmer, usually by phone. You can add listings now; buyers will see them once you're approved."}
        </p>
      </div>
    </div>
  );
}
