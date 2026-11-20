import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { homeFor, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Change password", robots: { index: false } };

export default async function ChangePasswordPage() {
  const user = await requireUser(routes.changePassword, { allowPendingPasswordChange: true });
  const forced = user.must_change_password;
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lift">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {forced ? "Set your own password" : "Change password"}
          </CardTitle>
          <CardDescription>
            {forced
              ? "You signed in with a one-time password. Choose a new one to continue."
              : "Enter your current password, then choose a new one."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm forced={forced} redirectTo={homeFor(user)} />
        </CardContent>
      </Card>
    </div>
  );
}
