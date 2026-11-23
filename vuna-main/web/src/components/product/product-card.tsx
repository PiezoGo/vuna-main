import type { Product } from "@vuna/api";
import { MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PriceTag } from "@/components/product/price-tag";
import { ProductImage } from "@/components/product/product-image";
import { Badge } from "@/components/ui/badge";
import { productImages, stockLabel } from "@/features/catalog/product";
import { productPath } from "@/lib/slug";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const [cover] = productImages(product);
  return (
    <Link
      href={productPath(product) as Route}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow outline-none hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ProductImage
        src={cover}
        alt={product.title}
        priority={priority}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="aspect-[4/3] [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.03]"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 leading-snug font-semibold">{product.title}</h3>
          {product.commodity ? (
            <Badge variant="muted" className="shrink-0 capitalize">
              {product.commodity}
            </Badge>
          ) : null}
        </div>
        <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {product.farmer_name}
            {product.farmer_city ? ` · ${product.farmer_city}` : ""}
          </span>
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <PriceTag price={product.listed_price_per_unit} unit={product.unit} />
          <span className="text-[12px] text-muted-foreground">{stockLabel(product)}</span>
        </div>
      </div>
    </Link>
  );
}
