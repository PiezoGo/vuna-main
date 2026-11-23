/** "Red Onions (90kg)" → "red-onions-90kg" */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Product URLs carry the id plus the name, e.g. /products/12-red-onions. */
export function productSlug(product: { id: number; title: string }): string {
  const name = slugify(product.title);
  return name ? `${product.id}-${name}` : String(product.id);
}

export function productPath(product: { id: number; title: string }): string {
  return `/products/${productSlug(product)}`;
}

/** "12-red-onions" → 12; anything without a leading id → null. */
export function productIdFromSlug(slug: string): number | null {
  const match = /^(\d+)(?:-|$)/.exec(slug);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
