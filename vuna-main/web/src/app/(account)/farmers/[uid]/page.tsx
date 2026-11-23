import { MapPin, Phone, Sprout, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/product/product-grid";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getFarmerProfile } from "@/lib/api/endpoints/catalog";
import { requireUser } from "@/lib/auth/session";
import { formatKePhone } from "@/lib/phone";
import { UUID_PATTERN as UUID } from "@/lib/uuid";

export const metadata: Metadata = { title: "Farmer", robots: { index: false, follow: false } };


export default async function FarmerProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  await requireUser(`/farmers/${uid}`);
  if (!UUID.test(uid)) notFound();
  const farmer = await getFarmerProfile(uid);
  if (!farmer || farmer.role !== "farmer") notFound();

  const place = [farmer.city, farmer.market].filter(Boolean).join(" · ");
  return (
    <section className="container-page grid gap-8 py-8 sm:py-10">
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-soft sm:flex-row sm:items-center">
        <Avatar className="size-16">
          <AvatarFallback className="text-xl">{initials(farmer.full_name)}</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 gap-1.5">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{farmer.full_name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {place ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" aria-hidden /> {place}
              </span>
            ) : null}
            {farmer.cooperative_name ? (
              <span className="flex items-center gap-1">
                <Users className="size-4" aria-hidden /> {farmer.cooperative_name}
              </span>
            ) : null}
            {farmer.phone_number ? (
              <a
                href={`tel:+${farmer.phone_number}`}
                className="flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <Phone className="size-4" aria-hidden /> {formatKePhone(farmer.phone_number)}
              </a>
            ) : null}
          </div>
          {farmer.bio ? <p className="max-w-2xl text-muted-foreground">{farmer.bio}</p> : null}
        </div>
        <div className="flex gap-2 sm:flex-col sm:items-end">
          <Badge variant="success">{farmer.completed_sales} completed sales</Badge>
          <Badge variant="muted">{farmer.total_listings} live listings</Badge>
        </div>
      </div>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">Produce from {farmer.full_name.split(" ")[0]}</h2>
        {farmer.products.length > 0 ? (
          <ProductGrid products={farmer.products} />
        ) : (
          <EmptyState
            icon={Sprout}
            title="No live listings right now"
            description="Check back after the next harvest."
          />
        )}
      </div>
    </section>
  );
}
