import { formatKES } from "@/lib/format";
import { cn } from "@/lib/utils";
import { unitLabel } from "@/features/catalog/product";

type PriceTagProps = { price: string | null; unit: string; size?: "sm" | "lg"; className?: string };

/** Listed price per unit, as calculated by the backend (delivery included). */
export function PriceTag({ price, unit, size = "sm", className }: PriceTagProps) {
  if (!price) return <span className="text-sm text-muted-foreground">Price on request</span>;
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className={cn("font-semibold text-foreground", size === "lg" ? "text-3xl" : "text-lg")}>
        {formatKES(price, { whole: Number(price) % 1 === 0 })}
      </span>
      <span className="text-sm text-muted-foreground">/ {unitLabel(unit)}</span>
    </span>
  );
}
