"use client";

import { toast } from "sonner";

import { errorMessage } from "@/components/admin/query-state";
import { Button } from "@/components/ui/button";
import { useOrderStep } from "@/features/admin/ops-queries";
import { nextStep } from "@/features/admin/steps";

/** One-tap manual fulfilment step (until drivers mark it themselves in Module 9). */
export function OrderStepButton({ id, status }: { id: number; status: string }) {
  const step = useOrderStep();
  const next = nextStep(status);
  if (!next) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      loading={step.isPending}
      onClick={() =>
        step.mutate(
          { id, status: next.step },
          {
            onSuccess: () => toast.success(`Order #${id}: ${next.label.replace("Mark ", "")}`),
            onError: (error) => toast.error(errorMessage(error, "Couldn't update the order.")),
          },
        )
      }
    >
      {next.label}
    </Button>
  );
}
