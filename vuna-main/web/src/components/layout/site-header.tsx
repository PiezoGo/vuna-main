import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { route, routes } from "@/config/routes";

/** Public site header. Signed-out state only for now; Module 2 adds the session menu. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center gap-6">
        <Link
          href={route(routes.home)}
          className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Logo />
          <span className="sr-only">VUNA home</span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <NavLinks />
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild>
            <Link href={route(routes.login)}>Sign in</Link>
          </Button>
          <Button asChild>
            <Link href={route(routes.signup)}>Get started</Link>
          </Button>
        </div>

        <MobileNav className="ml-auto md:hidden" />
      </div>
    </header>
  );
}
