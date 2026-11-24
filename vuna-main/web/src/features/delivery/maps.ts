/** A Google Maps search link for an address typed by people (no coordinates yet). */
export function mapsUrl(parts: (string | null | undefined)[]): string | null {
  const query = parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query}, Kenya`)}`;
}

export const PROBLEM_REASONS = [
  { value: "quality", label: "Poor quality" },
  { value: "quantity", label: "Wrong quantity" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "damaged", label: "Damaged" },
  { value: "other", label: "Something else" },
] as const;
