"use client";

import type { User } from "@vuna/api";
import { toast } from "sonner";

import { errorMessage } from "@/components/admin/query-state";
import { Button } from "@/components/ui/button";
import { useSetUserActive } from "@/features/admin/user-queries";

/** Deactivate (signs them out, blocks sign-in; their orders stay) or reactivate an account. */
export function ActiveToggleButton({ user }: { user: User }) {
  const setActive = useSetUserActive();
  if (user.role === "admin") return null;
  const active = user.is_active;
  const onClick = () => {
    if (
      active &&
      !window.confirm(
        `Deactivate ${user.full_name}? They are signed out and can't sign in until reactivated.`,
      )
    )
      return;
    setActive.mutate(
      { uid: user.uid, active: !active },
      {
        onSuccess: () =>
          toast.success(`${user.full_name} ${active ? "deactivated" : "reactivated"}`),
        onError: (error) => toast.error(errorMessage(error, "Couldn't change the account.")),
      },
    );
  };
  return (
    <Button
      size="sm"
      variant={active ? "ghost" : "outline"}
      onClick={onClick}
      loading={setActive.isPending}
    >
      {active ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
