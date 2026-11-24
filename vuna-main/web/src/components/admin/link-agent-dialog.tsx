"use client";

import type { User } from "@vuna/api";
import * as React from "react";
import { toast } from "sonner";

import { errorMessage } from "@/components/admin/query-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminUsers, useLinkAgent } from "@/features/admin/user-queries";

const NONE = "none";

type Props = { farmer: User; open: boolean; onOpenChange: (open: boolean) => void };

/** Link a farmer to a field agent, who can then list produce for them. */
export function LinkAgentDialog({ farmer, open, onOpenChange }: Props) {
  const agents = useAdminUsers({ role: "agent" });
  const link = useLinkAgent();
  const [agent, setAgent] = React.useState(farmer.agent ?? NONE);
  const [error, setError] = React.useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    link.mutate(
      { uid: farmer.uid, agent: agent === NONE ? null : agent },
      {
        onSuccess: () => {
          toast.success(agent === NONE ? "Agent removed" : `${farmer.full_name} linked`);
          onOpenChange(false);
        },
        onError: (err) => setError(errorMessage(err, "Couldn't save. Try again.")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Field agent for {farmer.full_name}</DialogTitle>
            <DialogDescription>
              The agent can list and manage produce on this farmer&apos;s behalf.
            </DialogDescription>
          </DialogHeader>
          <Field htmlFor={`agent-${farmer.uid}`} label="Field agent" error={error}>
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger id={`agent-${farmer.uid}`}>
                <SelectValue
                  placeholder={agents.isPending ? "Loading agents…" : "Choose an agent"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No agent</SelectItem>
                {(agents.data ?? [])
                  .filter((a) => a.is_active)
                  .map((a) => (
                    <SelectItem key={a.uid} value={a.uid}>
                      {a.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={link.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
