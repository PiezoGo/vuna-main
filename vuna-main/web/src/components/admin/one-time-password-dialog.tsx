"use client";

import type { StaffCredentials } from "@vuna/api";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = { credentials: StaffCredentials | null; onClose: () => void };

/** Shows a one-time password once. It can't be shown again; reset it to issue a new one. */
export function OneTimePasswordDialog({ credentials, onClose }: Props) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't copy. Write it down instead.");
    }
  };

  return (
    <Dialog open={credentials !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden /> Sign-in details for{" "}
            {credentials?.user.full_name}
          </DialogTitle>
          <DialogDescription>
            Give these to them now. The password is shown only once; they must choose their own when
            they first sign in.
          </DialogDescription>
        </DialogHeader>
        {credentials ? (
          <dl className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
            <div className="grid gap-1">
              <dt className="text-muted-foreground">Email to sign in with</dt>
              <dd className="flex items-center justify-between gap-2 font-mono break-all">
                {credentials.login_email}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Copy email"
                  onClick={() => copy(credentials.login_email)}
                >
                  <Copy />
                </Button>
              </dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-muted-foreground">One-time password</dt>
              <dd className="flex items-center justify-between gap-2 font-mono text-lg font-semibold tracking-wider">
                {credentials.one_time_password}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Copy password"
                  onClick={() => copy(credentials.one_time_password)}
                >
                  <Copy />
                </Button>
              </dd>
            </div>
          </dl>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose}>I&apos;ve given it to them</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
