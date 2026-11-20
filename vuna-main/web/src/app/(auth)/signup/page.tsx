import type { Cooperative } from "@vuna/api";
import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { route, routes } from "@/config/routes";
import { publicApi } from "@/lib/api/server";
import { unwrap } from "@/lib/api/result";

export const metadata: Metadata = { title: "Create an account" };

// Refresh the cooperative list every 5 minutes.
export const revalidate = 300;

async function loadCooperatives(): Promise<Cooperative[]> {
  try {
    return await unwrap(publicApi().GET("/api/cooperatives/"));
  } catch (error) {
    // Sign-up still works without the list; the cooperative is optional.
    console.error("[signup] could not load cooperatives", error);
    return [];
  }
}

export default async function SignupPage() {
  const cooperatives = await loadCooperatives();
  return (
    <div className="w-full max-w-xl">
      <Card className="shadow-lift">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Join VUNA</CardTitle>
          <CardDescription>
            Sell your harvest at your own price, or buy direct from Kenyan farms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm cooperatives={cooperatives.map(({ id, name }) => ({ id, name }))} />
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={route(routes.login)} className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
