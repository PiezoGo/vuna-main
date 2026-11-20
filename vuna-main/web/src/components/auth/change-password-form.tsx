"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { applyApiErrors } from "@/features/auth/form-errors";
import { authKeys } from "@/features/auth/queries";
import { changePasswordSchema, type ChangePasswordValues } from "@/features/auth/schemas";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

const FIELDS = ["current_password", "new_password", "confirm_password"] as const;

export function ChangePasswordForm({ forced, redirectTo }: { forced: boolean; redirectTo: Route }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const onSubmit = handleSubmit(async ({ current_password, new_password }) => {
    setFormError(null);
    try {
      const user = await unwrap(
        clientApi.POST("/api/auth/change-password/", { body: { current_password, new_password } }),
      );
      queryClient.setQueryData(authKeys.session, user);
      toast.success("Password updated");
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  const hint = "At least 8 characters, not only numbers.";
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormAlert message={formError} />
      <Field
        htmlFor="current_password"
        label={forced ? "One-time password" : "Current password"}
        error={errors.current_password?.message}
      >
        <PasswordInput
          id="current_password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.current_password)}
          aria-describedby={fieldDescribedBy("current_password", {
            error: errors.current_password?.message,
          })}
          {...register("current_password")}
        />
      </Field>
      <Field
        htmlFor="new_password"
        label="New password"
        hint={hint}
        error={errors.new_password?.message}
      >
        <PasswordInput
          id="new_password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.new_password)}
          aria-describedby={fieldDescribedBy("new_password", {
            error: errors.new_password?.message,
            hint,
          })}
          {...register("new_password")}
        />
      </Field>
      <Field
        htmlFor="confirm_password"
        label="Confirm new password"
        error={errors.confirm_password?.message}
      >
        <PasswordInput
          id="confirm_password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirm_password)}
          aria-describedby={fieldDescribedBy("confirm_password", {
            error: errors.confirm_password?.message,
          })}
          {...register("confirm_password")}
        />
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Save password
      </Button>
    </form>
  );
}
