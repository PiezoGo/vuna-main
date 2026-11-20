import type { Metadata } from "next";

import { ProfileForm } from "@/components/auth/profile-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/config/routes";
import { requireUser } from "@/lib/auth/session";
import { isRole, roleLabels } from "@/types/auth";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const user = await requireUser(routes.profile);
  return (
    <section className="container-page max-w-2xl py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-display text-2xl">Your profile</CardTitle>
            {isRole(user.role) ? <Badge>{roleLabels[user.role]}</Badge> : null}
          </div>
          <CardDescription>
            Signed in as {user.email}. Your role and approval status can only be changed by VUNA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </section>
  );
}
