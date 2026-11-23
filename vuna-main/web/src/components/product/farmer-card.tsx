import { MapPin, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { Button } from "@/components/ui/button";

type FarmerCardProps = {
  uid: string;
  name: string;
  city?: string | null;
  market?: string | null;
  cooperative?: string | null;
};

export function FarmerCard({ uid, name, city, market, cooperative }: FarmerCardProps) {
  const place = [city, market].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
      <Avatar className="size-12">
        <AvatarFallback className="text-base">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="text-xs text-muted-foreground">Grown by</p>
        <p className="truncate font-semibold">{name}</p>
        {place ? (
          <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden /> {place}
          </p>
        ) : null}
        {cooperative ? (
          <p className="flex items-center gap-1 truncate text-[13px] text-muted-foreground">
            <Users className="size-3.5 shrink-0" aria-hidden /> {cooperative}
          </p>
        ) : null}
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/farmers/${uid}` as Route}>View farmer</Link>
      </Button>
    </div>
  );
}
