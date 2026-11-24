import type { OrderStep } from "@vuna/api";

/** The next manual step an admin can take on an order line (mirrors backend fulfilment.STEPS). */
const NEXT: Record<string, { step: OrderStep; label: string }> = {
  assigned: { step: "collected", label: "Mark collected" },
  paid: { step: "collected", label: "Mark collected" },
  collected: { step: "delivered", label: "Mark delivered" },
  in_transit: { step: "delivered", label: "Mark delivered" },
  delivered: { step: "completed", label: "Mark completed" },
};

export function nextStep(status: string): { step: OrderStep; label: string } | null {
  return NEXT[status] ?? null;
}

/** Group lines by delivery area so ops can build trips going the same way. */
export function groupByArea<T extends { delivery_area?: string | null }>(lines: T[]) {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    const area = line.delivery_area?.trim() || "No area";
    groups.set(area, [...(groups.get(area) ?? []), line]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
