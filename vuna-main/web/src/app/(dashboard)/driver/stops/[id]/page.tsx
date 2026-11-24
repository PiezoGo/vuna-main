import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DriverStopDetail } from "@/components/delivery/driver-stop-detail";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Stop" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DriverStopPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireUser(`/driver/stops/${id}`, { roles: ["driver"] });
  const orderId = Number(id);
  if (!Number.isSafeInteger(orderId) || orderId < 1) notFound();
  const kind = (await searchParams).kind === "dropoff" ? "dropoff" : "pickup";
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Driver" title={kind === "pickup" ? "Farm pickup" : "Drop-off"} />
      <DriverStopDetail id={orderId} kind={kind} />
    </div>
  );
}
