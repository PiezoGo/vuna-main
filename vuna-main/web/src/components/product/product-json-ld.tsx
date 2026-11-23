import type { Product } from "@vuna/api";

import { siteConfig } from "@/config/site";
import { productImages } from "@/features/catalog/product";
import { productPath } from "@/lib/slug";

/** schema.org Product data so search engines can show price and availability. */
export function ProductJsonLd({ product }: { product: Product }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description:
      product.description || `${product.title} from ${product.farmer_name}, sold on VUNA.`,
    image: productImages(product),
    category: product.commodity ?? undefined,
    brand: { "@type": "Brand", name: product.farmer_name },
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}${productPath(product)}`,
      priceCurrency: "KES",
      price: product.listed_price_per_unit ?? undefined,
      availability:
        product.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: siteConfig.name },
    },
  };
  // JSON in a script tag: escape "<" so text in the data can never close the tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
