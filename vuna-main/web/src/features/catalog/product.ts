import type { Product } from "@vuna/api";

/** Image URLs from the API's free-form `images` field, keeping only real http(s) strings. */
export function productImages(product: Pick<Product, "images">): string[] {
  const images = product.images;
  if (!Array.isArray(images)) return [];
  return images.filter((src): src is string => typeof src === "string" && /^https?:\/\//.test(src));
}

const UNIT_LABELS: Record<string, { one: string; many: string }> = {
  kg: { one: "kg", many: "kg" },
  sack: { one: "sack", many: "sacks" },
  piece: { one: "piece", many: "pieces" },
  bunch: { one: "bunch", many: "bunches" },
  litre: { one: "litre", many: "litres" },
};

/** "kg", "sack" / "sacks" … */
export function unitLabel(unit: string, quantity = 1): string {
  const label = UNIT_LABELS[unit];
  if (!label) return unit;
  return quantity === 1 ? label.one : label.many;
}

/** "120 kg available", "Sold out" */
export function stockLabel(product: Pick<Product, "quantity" | "unit">): string {
  if (product.quantity <= 0) return "Sold out";
  return `${product.quantity.toLocaleString("en-KE")} ${unitLabel(product.unit, product.quantity)} available`;
}

/** The price a buyer pays per unit. Falls back to nothing rather than computing it here. */
export function buyerUnitPrice(product: Pick<Product, "listed_price_per_unit">): string | null {
  return product.listed_price_per_unit ?? null;
}
