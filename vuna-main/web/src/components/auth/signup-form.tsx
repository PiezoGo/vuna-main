"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { RolePicker } from "@/components/auth/role-picker";
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
import { roleHome } from "@/config/routes";
import { applyApiErrors } from "@/features/auth/form-errors";
import { authKeys } from "@/features/auth/queries";
import { BUYER_TYPES, MARKETS, signupSchema, type SignupValues } from "@/features/auth/schemas";
import { authClient } from "@/lib/api/auth-client";
import { normalizeKePhone } from "@/lib/phone";

const PASSWORD_HINT = "At least 8 characters, not only numbers.";
const FIELDS = [
  "role",
  "full_name",
  "email",
  "phone_number",
  "password",
  "city",
  "market",
  "buyer_type",
  "cooperative",
] as const;

export function SignupForm({ cooperatives }: { cooperatives: { id: number; name: string }[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: "", phone_number: "", password: "", city: "" },
  });
  const role = useWatch({ control, name: "role" });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await authClient.register({
        role: values.role,
        full_name: values.full_name,
        email: values.email,
        phone_number: normalizeKePhone(values.phone_number),
        password: values.password,
        city: values.city,
        market: values.market ?? "",
        ...(values.role === "buyer" ? { buyer_type: values.buyer_type } : {}),
        ...(values.role === "farmer" && values.cooperative
          ? { cooperative: Number(values.cooperative) }
          : {}),
      });
      queryClient.setQueryData(authKeys.session, user);
      router.replace(roleHome[values.role] as Route);
      router.refresh();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  const err = (name: (typeof FIELDS)[number]) => errors[name]?.message;
  const described = (name: (typeof FIELDS)[number]) => fieldDescribedBy(name, { error: err(name) });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormAlert message={formError} />

      <div className="grid gap-2">
        <span className="text-sm font-medium">I want to</span>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <RolePicker
              value={field.value}
              onChange={field.onChange}
              invalid={Boolean(errors.role)}
            />
          )}
        />
        {errors.role ? (
          <p role="alert" className="text-[13px] text-destructive">
            {errors.role.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          htmlFor="full_name"
          label="Full name"
          required
          error={err("full_name")}
          className="sm:col-span-2"
        >
          <Input
            id="full_name"
            autoComplete="name"
            aria-invalid={Boolean(errors.full_name)}
            aria-describedby={described("full_name")}
            {...register("full_name")}
          />
        </Field>
        <Field htmlFor="email" label="Email" required error={err("email")}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={described("email")}
            {...register("email")}
          />
        </Field>
        <Field
          htmlFor="phone_number"
          label="M-Pesa phone number"
          required
          error={err("phone_number")}
        >
          <Input
            id="phone_number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            aria-invalid={Boolean(errors.phone_number)}
            aria-describedby={described("phone_number")}
            {...register("phone_number")}
          />
        </Field>
        <Field
          htmlFor="password"
          label="Password"
          required
          hint={PASSWORD_HINT}
          error={err("password")}
          className="sm:col-span-2"
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={fieldDescribedBy("password", {
              error: err("password"),
              hint: PASSWORD_HINT,
            })}
            {...register("password")}
          />
        </Field>
        <Field htmlFor="city" label="Town or city" required error={err("city")}>
          <Input
            id="city"
            autoComplete="address-level2"
            placeholder="Limuru"
            aria-invalid={Boolean(errors.city)}
            aria-describedby={described("city")}
            {...register("city")}
          />
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

        {role === "buyer" ? (
          <Field
            htmlFor="buyer_type"
            label="Business type"
            required
            error={err("buyer_type")}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="buyer_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="buyer_type"
                    aria-invalid={Boolean(errors.buyer_type)}
                    aria-describedby={described("buyer_type")}
                  >
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

        {role === "farmer" && cooperatives.length > 0 ? (
          <Field
            htmlFor="cooperative"
            label="Cooperative or cluster"
            hint="Optional"
            error={err("cooperative")}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="cooperative"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cooperative">
                    <SelectValue placeholder="Not part of one" />
                  </SelectTrigger>
                  <SelectContent>
                    {cooperatives.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        ) : null}
      </div>

      {role === "farmer" ? (
        <p className="rounded-xl bg-primary-soft px-4 py-3 text-[13px] text-secondary-foreground">
          The VUNA team checks every new farmer, usually by phone. Your listings go live once
          you&apos;re approved.
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Create account
      </Button>
      <p className="text-center text-[12px] text-muted-foreground">
        By creating an account you agree to VUNA&apos;s terms.
      </p>
    </form>
  );
}
