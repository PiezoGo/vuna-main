import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { route, routes } from "@/config/routes";

/** Centered card layout for sign-in, sign-up and password pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,var(--color-primary-soft),transparent_60%)]">
      <header className="container-page flex h-16 items-center">
        <Link href={route(routes.root)} aria-label="VUNA home">
          <Logo />
        </Link>
      </header>
      <main
        id="main"
        className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0"
      >
        {children}
      </main>
    </div>
  );
}
