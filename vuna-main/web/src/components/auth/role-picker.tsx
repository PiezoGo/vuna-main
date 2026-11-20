"use client";

import { ShoppingBasket, Sprout } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const options = [
  { value: "farmer", title: "I'm a farmer", text: "Sell my harvest", icon: Sprout },
  { value: "buyer", title: "I'm a buyer", text: "Hotel, shop or wholesaler", icon: ShoppingBasket },
] as const;

type RolePickerProps = {
  value: string | undefined;
  onChange: (value: "farmer" | "buyer") => void;
  invalid?: boolean;
};

/** Two large radio cards. Built on Radix RadioGroup, so arrow keys and screen readers work. */
export function RolePicker({ value, onChange, invalid }: RolePickerProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(v) => onChange(v as "farmer" | "buyer")}
      aria-label="Account type"
      aria-invalid={invalid}
      className="grid grid-cols-2 gap-3"
    >
      {options.map(({ value: v, title, text, icon: Icon }) => (
        <RadioGroupPrimitive.Item
          key={v}
          value={v}
          className={cn(
            "flex cursor-pointer flex-col items-start gap-2 rounded-xl border-2 border-border bg-card p-4 text-left transition-all outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft",
            invalid && "border-destructive/60",
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-[13px] text-muted-foreground">{text}</span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
