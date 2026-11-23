import { CalendarDays, Package, Scale, Truck } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { BuyBox } from "@/components/product/buy-box";
import { FarmerCard } from "@/components/product/farmer-card";
import { PriceTag } from "@/components/product/price-tag";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductJsonLd } from "@/components/product/product-json-ld";
import { Badge } from "@/components/ui/badge";
import { productImages, stockLabel, unitLabel } from "@/features/catalog/product";
import { getProduct } from "@/lib/api/endpoints/catalog";
import { formatDate } from "@/lib/format";
import { productIdFromSlug, productSlug } from "@/lib/slug";

// Built on first visit, then refreshed at most once a minute (ISR).
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const id = productIdFromSlug(slug);
  if (!id) notFound();
  const product = await getProduct(id);
  if (!product) notFound();
  return product;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await load((await params).slug);
  const [cover] = productImages(product);
  const description =
    product.description ||
    `${product.title} from ${product.farmer_name}${product.farmer_city ? ` in ${product.farmer_city}` : ""}. Order direct from the farm on VUNA.`;
  return {
    title: product.title,
    description,
    alternates: { canonical: `/products/${productSlug(product)}` },
    openGraph: { title: product.title, description, images: cover ? [{ url: cover }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await load(slug);
  const canonical = productSlug(product);
  if (slug !== canonical) permanentRedirect(`/products/${canonical}` as Route);

  const path = `/products/${canonical}`;
  const minimum = product.min_order_quantity ?? 1;

  const facts = [
    { icon: Package, label: "Available", value: stockLabel(product) },
    {
      icon: Scale,
      label: "Minimum order",
      value: `${minimum} ${unitLabel(product.unit, minimum)}`,
    },
    ...(product.harvest_date
      ? [{ icon: CalendarDays, label: "Harvest date", value: formatDate(product.harvest_date) }]
      : []),
    { icon: Truck, label: "Delivery", value: "Included in the price" },
  ];

  return (
    <article className="container-page py-8 sm:py-10">
      <ProductJsonLd product={product} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href={"/market" as Route} className="hover:text-foreground">
          Market
        </Link>
        {product.commodity ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/market?commodity=${encodeURIComponent(product.commodity)}` as Route}
              className="capitalize hover:text-foreground"
            >
              {product.commodity}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={productImages(product)} title={product.title} />

        <div className="grid content-start gap-6">
          <div className="grid gap-3">
            {product.commodity ? (
              <Badge variant="muted" className="capitalize">
                {product.commodity}
              </Badge>
            ) : null}
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{product.title}</h1>
            <PriceTag price={product.listed_price_per_unit} unit={product.unit} size="lg" />
            <p className="text-sm text-muted-foreground">
              The farmer sets this price. Delivery to your business is included.
            </p>
          </div>

          <BuyBox
            productPath={path}
            productId={product.id}
            unit={product.unit}
            min={minimum}
            available={product.quantity}
          />

          <dl className="grid grid-cols-2 gap-3">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border bg-card p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="size-3.5" aria-hidden /> {label}
                </dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {product.description ? (
            <section className="grid gap-2">
              <h2 className="font-semibold">About this produce</h2>
              <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
            </section>
          ) : null}

          <FarmerCard
            uid={product.farmer_uid}
            name={product.farmer_name}
            city={product.farmer_city}
            market={product.farmer_market}
            cooperative={product.farmer_cooperative}
          />
        </div>
      </div>
    </article>
  );
}
