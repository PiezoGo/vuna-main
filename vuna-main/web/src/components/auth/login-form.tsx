"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { roleHome, routes, safeNext } from "@/config/routes";
import { applyApiErrors } from "@/features/auth/form-errors";
import { authKeys, useSession } from "@/features/auth/queries";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";
import { authClient } from "@/lib/api/auth-client";
import { isRole } from "@/types/auth";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { data: current } = useSession();

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { user } = await authClient.login(values);
      queryClient.setQueryData(authKeys.session, user);
      const destination = user.must_change_password
        ? routes.changePassword
        : (next ?? (isRole(user.role) ? roleHome[user.role] : routes.root));
      router.replace(destination as Route);
      router.refresh();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, ["email", "password"]));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {current ? (
        <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm">
          You&apos;re already signed in as <span className="font-medium">{current.full_name}</span>.{" "}
          <Link
            href={(isRole(current.role) ? roleHome[current.role] : routes.root) as Route}
            className="font-semibold text-primary hover:underline"
          >
            Continue
          </Link>{" "}
          or sign in with another account below.
        </p>
      ) : null}
      <FormAlert message={formError} />
      <Field htmlFor="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@business.co.ke"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={fieldDescribedBy("email", { error: errors.email?.message })}
          {...register("email")}
        />
      </Field>
      <Field htmlFor="password" label="Password" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={fieldDescribedBy("password", { error: errors.password?.message })}
          {...register("password")}
        />
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
        Sign in
      </Button>
      <p className="text-center text-[13px] text-muted-foreground">
        Forgot your password? Contact VUNA support and we&apos;ll send you a one-time password.
      </p>
    </form>
  );
}
