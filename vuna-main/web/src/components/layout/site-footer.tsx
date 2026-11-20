import Link from "next/link";
import type { Route } from "next";

import { Logo } from "@/components/brand/logo";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse produce", href: routes.market },
      { label: "Sell on VUNA", href: routes.signup },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: routes.about },
      { label: "Team", href: routes.team },
      { label: "Terms", href: routes.terms },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{siteConfig.description}</p>
        </div>
        {columns.map((column) => (
          <div key={column.title} className="grid content-start gap-3">
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="grid gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} VUNA. Grown in Kenya.</p>
          <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-foreground">
            {siteConfig.contactEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
