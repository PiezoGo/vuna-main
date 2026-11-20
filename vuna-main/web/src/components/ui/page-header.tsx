import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="grid gap-1.5">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
