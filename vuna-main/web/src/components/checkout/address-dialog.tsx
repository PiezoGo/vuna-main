"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { DeliveryAddress } from "@vuna/api";
import { Plus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiErrors } from "@/features/auth/form-errors";
import { useCreateAddress } from "@/features/checkout/queries";
import { addressSchema, type AddressValues } from "@/features/checkout/schemas";
import { normalizeKePhone } from "@/lib/phone";

const FIELDS = ["label", "contact_name", "contact_phone", "area", "details", "landmark"] as const;
const LABELS: Record<(typeof FIELDS)[number], string> = {
  label: "Name for this address",
  contact_name: "Who receives it",
  contact_phone: "Their phone",
  area: "Town or neighbourhood",
  details: "Building, street or gate",
  landmark: "Landmark (optional)",
};

export function AddressDialog({ onCreated }: { onCreated: (address: DeliveryAddress) => void }) {
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const create = useCreateAddress();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const address = await create.mutateAsync({
        ...values,
        contact_phone: normalizeKePhone(values.contact_phone) ?? values.contact_phone,
        landmark: values.landmark ?? "",
      });
      onCreated(address);
      reset();
      setOpen(false);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus /> Add an address
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>New delivery address</DialogTitle>
            <DialogDescription>Saved for next time.</DialogDescription>
          </DialogHeader>
          <FormAlert message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((name) => (
              <Field
                key={name}
                htmlFor={`addr-${name}`}
                label={LABELS[name]}
                error={errors[name]?.message}
                className={name === "details" || name === "landmark" ? "sm:col-span-2" : undefined}
              >
                <Input
                  id={`addr-${name}`}
                  type={name === "contact_phone" ? "tel" : "text"}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={fieldDescribedBy(`addr-${name}`, {
                    error: errors[name]?.message,
                  })}
                  {...register(name)}
                />
              </Field>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
