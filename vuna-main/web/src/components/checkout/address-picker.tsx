"use client";

import type { DeliveryAddress } from "@vuna/api";
import { MapPin } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { AddressDialog } from "@/components/checkout/address-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddresses } from "@/features/checkout/queries";
import { formatKePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export function AddressPicker({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (id: number) => void;
}) {
  const { data, isPending } = useAddresses();
  if (isPending) return <Skeleton className="h-24" />;
  const addresses: DeliveryAddress[] = data ?? [];

  return (
    <div className="grid gap-3">
      {addresses.length > 0 ? (
        <RadioGroupPrimitive.Root
          value={value ? String(value) : undefined}
          onValueChange={(v) => onChange(Number(v))}
          aria-label="Delivery address"
          className="grid gap-3 sm:grid-cols-2"
        >
          {addresses.map((a) => (
            <RadioGroupPrimitive.Item
              key={a.id}
              value={String(a.id)}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border-2 border-border bg-card p-4 text-left outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft",
              )}
            >
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span className="grid gap-0.5 text-sm">
                <span className="font-semibold">{a.label}</span>
                <span className="text-muted-foreground">
                  {a.details}, {a.area}
                </span>
                <span className="text-muted-foreground">
                  {a.contact_name} · {formatKePhone(a.contact_phone)}
                </span>
              </span>
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
      ) : (
        <p className="text-sm text-muted-foreground">You have no saved addresses yet.</p>
      )}
      <div>
        <AddressDialog onCreated={(a) => onChange(a.id)} />
      </div>
    </div>
  );
}
