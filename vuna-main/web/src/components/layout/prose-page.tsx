import { PageHeader } from "@/components/ui/page-header";

/** Simple reading layout for information pages. */
export function ProsePage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-page max-w-3xl py-12 sm:py-16">
      <PageHeader
        eyebrow={eyebrow}
        title={<span className="font-display">{title}</span>}
        description={intro}
      />
      <div className="mt-10 grid gap-6 text-[15px] leading-relaxed text-foreground/85 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
        {children}
      </div>
    </section>
  );
}
