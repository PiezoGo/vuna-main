import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { homeFor, requireUser } from "@/lib/auth/session";

/** Sends a signed-in user to their role's home (used after sign-in and by the proxy). */
export default async function HomeRedirect() {
  const user = await requireUser(routes.home);
  redirect(homeFor(user));
}
