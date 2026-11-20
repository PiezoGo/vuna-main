"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@vuna/api";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyApiErrors } from "@/features/auth/form-errors";
import { authKeys } from "@/features/auth/queries";
import { BUYER_TYPES, MARKETS, profileSchema, type ProfileValues } from "@/features/auth/schemas";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";
import { formatKePhone, normalizeKePhone } from "@/lib/phone";

const BIO_HINT = "Shown on your profile to signed-in users.";
const FIELDS = ["full_name", "phone_number", "city", "market", "bio", "buyer_type"] as const;

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user.full_name,
      phone_number: formatKePhone(user.phone_number),
      city: user.city ?? "",
      market: user.market || undefined,
      bio: user.bio ?? "",
      buyer_type:
        user.buyer_type === "hotel" ||
        user.buyer_type === "retailer" ||
        user.buyer_type === "wholesaler"
          ? user.buyer_type
          : undefined,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await unwrap(
        clientApi.PUT("/api/profile/", {
          body: {
            full_name: values.full_name,
            phone_number: normalizeKePhone(values.phone_number) ?? values.phone_number,
            city: values.city ?? "",
            market: values.market ?? "",
            bio: values.bio ?? "",
            ...(user.role === "buyer" && values.buyer_type
              ? { buyer_type: values.buyer_type }
              : {}),
          },
        }),
      );
      queryClient.setQueryData(authKeys.session, updated);
      reset({ ...values, phone_number: formatKePhone(updated.phone_number) });
      toast.success("Profile saved");
      router.refresh();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  const err = (name: (typeof FIELDS)[number]) => errors[name]?.message;
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormAlert message={formError} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="full_name"
          label="Full name"
          error={err("full_name")}
          className="sm:col-span-2"
        >
          <Input
            id="full_name"
            autoComplete="name"
            aria-invalid={Boolean(errors.full_name)}
            aria-describedby={fieldDescribedBy("full_name", { error: err("full_name") })}
            {...register("full_name")}
          />
        </Field>
        <Field htmlFor="phone_number" label="M-Pesa phone number" error={err("phone_number")}>
          <Input
            id="phone_number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone_number)}
            aria-describedby={fieldDescribedBy("phone_number", { error: err("phone_number") })}
            {...register("phone_number")}
          />
        </Field>
        <Field htmlFor="city" label="Town or city" error={err("city")}>
          <Input id="city" autoComplete="address-level2" {...register("city")} />
        </Field>
        <Field htmlFor="market" label="Main market" error={err("market")}>
          <Controller
            control={control}
            name="market"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="market">
                  <SelectValue placeholder="Choose a market" />
                </SelectTrigger>
                <SelectContent>
                  {MARKETS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        {user.role === "buyer" ? (
          <Field htmlFor="buyer_type" label="Business type" error={err("buyer_type")}>
            <Controller
              control={control}
              name="buyer_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="buyer_type">
                    <SelectValue placeholder="Choose your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUYER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        ) : null}
        <Field
          htmlFor="bio"
          label="About you"
          hint={BIO_HINT}
          error={err("bio")}
          className="sm:col-span-2"
        >
          <Textarea
            id="bio"
            maxLength={500}
            aria-describedby={fieldDescribedBy("bio", { error: err("bio"), hint: BIO_HINT })}
            {...register("bio")}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
