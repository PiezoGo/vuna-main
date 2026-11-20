import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { route, routes } from "@/config/routes";

/** Public site header. The session part loads on the client, so public pages stay static. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center gap-6">
        <Link
          href={route(routes.root)}
          className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Logo />
          <span className="sr-only">VUNA home</span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <NavLinks />
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <HeaderAuth />
        </div>

        <MobileNav className="ml-auto md:hidden" />
      </div>
    </header>
  );
}
