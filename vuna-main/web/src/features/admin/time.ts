const TIME_ZONE = "Africa/Nairobi";

/** A calendar date in Nairobi as YYYY-MM-DD, `offsetDays` from `now`. */
export function nairobiDate(offsetDays = 0, now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + offsetDays * 86_400_000);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(shifted);
}

export type Countdown = { label: string; overdue: boolean; urgent: boolean };

/** Time left until a payout is due, e.g. "2h 05m left" or "45m overdue". */
export function payoutCountdown(
  dueBy: string | null | undefined,
  now: Date = new Date(),
): Countdown {
  if (!dueBy) return { label: "Not collected", overdue: false, urgent: false };
  const minutes = Math.floor((new Date(dueBy).getTime() - now.getTime()) / 60_000);
  const abs = Math.abs(minutes);
  const text =
    abs >= 60 ? `${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m` : `${abs}m`;
  if (minutes < 0) return { label: `${text} overdue`, overdue: true, urgent: true };
  return { label: `${text} left`, overdue: false, urgent: minutes < 60 };
}
