"use client";

import { Clock, Zap } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export type PaymentChoiceValue = "pay_now" | "pay_after";

const options = [
  {
    value: "pay_now",
    icon: Zap,
    title: "Pay now",
    text: "Fastest. Anything a farmer can't supply is refunded automatically.",
  },
  {
    value: "pay_after",
    icon: Clock,
    title: "Pay after farmers confirm",
    text: "Farmers answer within 2 hours, then you pay only for what they accept.",
  },
] as const;

export function PaymentChoice({
  value,
  onChange,
}: {
  value: PaymentChoiceValue;
  onChange: (v: PaymentChoiceValue) => void;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(v) => onChange(v as PaymentChoiceValue)}
      aria-label="When to pay"
      className="grid gap-3 sm:grid-cols-2"
    >
      {options.map(({ value: v, icon: Icon, title, text }) => (
        <RadioGroupPrimitive.Item
          key={v}
          value={v}
          className={cn(
            "flex cursor-pointer gap-3 rounded-xl border-2 border-border bg-card p-4 text-left transition-all outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft",
          )}
        >
          <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span className="grid gap-1">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-[13px] text-muted-foreground">{text}</span>
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
