"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  unit?: string;
};

export function QuantityStepper({ id, value, min, max, onChange, unit }: Props) {
  const clamp = (n: number) =>
    Math.min(max, Math.max(min, Number.isFinite(n) ? Math.floor(n) : min));
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Less"
      >
        <Minus />
      </Button>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-20 [appearance:textfield] text-center [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={unit ? `Quantity in ${unit}` : "Quantity"}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="More"
      >
        <Plus />
      </Button>
      {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
    </div>
  );
}
