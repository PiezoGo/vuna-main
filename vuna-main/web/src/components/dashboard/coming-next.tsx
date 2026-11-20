import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

/** Placeholder for dashboard pages built in later modules. */
export function ComingNext({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} className="mt-8" />;
}
