"use client";

import type { StaffCredentials } from "@vuna/api";
import * as React from "react";

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
import { Input } from "@/components/ui/input";
import { useCreateStaff } from "@/features/admin/user-queries";
import { ApiError } from "@/lib/api/errors";

type Props = {
  role: "driver" | "agent";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (credentials: StaffCredentials) => void;
};

const LABEL = { driver: "driver", agent: "field agent" };

export function AddStaffDialog({ role, open, onOpenChange, onCreated }: Props) {
  const create = useCreateStaff();
  const [form, setForm] = React.useState({
    full_name: "",
    phone_number: "",
    email: "",
    vehicle_type: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined, form: undefined }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.full_name.trim().length < 2) return setErrors({ full_name: "Enter their full name." });
    if (!form.phone_number.trim()) return setErrors({ phone_number: "Enter their phone number." });
    create.mutate(
      {
        role,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        email: form.email.trim() || undefined,
        vehicle_type: role === "driver" ? form.vehicle_type.trim() || undefined : undefined,
      },
      {
        onSuccess: (credentials) => {
          setForm({ full_name: "", phone_number: "", email: "", vehicle_type: "" });
          onOpenChange(false);
          onCreated(credentials);
        },
        onError: (err) =>
          setErrors(
            err instanceof ApiError && Object.keys(err.fieldErrors).length > 0
              ? Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0]]))
              : { form: errorMessage(err, "Couldn't add them. Try again.") },
          ),
      },
    );
  };

  const field = (
    key: keyof typeof form,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <Field htmlFor={`staff-${key}`} label={label} error={errors[key]}>
      <Input
        id={`staff-${key}`}
        value={form[key]}
        onChange={set(key)}
        aria-invalid={Boolean(errors[key])}
        {...props}
      />
    </Field>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add a {LABEL[role]}</DialogTitle>
            <DialogDescription>
              We&apos;ll create their account and show a one-time password to give them.
            </DialogDescription>
          </DialogHeader>
          {field("full_name", "Full name", { autoComplete: "off" })}
          {field("phone_number", "Phone number", { type: "tel", placeholder: "0712 345 678" })}
          {field("email", "Email (optional)", {
            type: "email",
            placeholder: "We'll make one if empty",
          })}
          {role === "driver"
            ? field("vehicle_type", "Vehicle (optional)", { placeholder: "Pickup, motorbike…" })
            : null}
          {errors.form ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.form}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add {LABEL[role]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
