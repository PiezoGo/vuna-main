"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "@vuna/api";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/form-alert";
import { PhotoPicker, type PhotoSlot } from "@/components/listings/photo-picker";
import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyApiErrors } from "@/features/auth/form-errors";
import { productImages } from "@/features/catalog/product";
import { useSaveListing } from "@/features/listings/queries";
import {
  UNITS,
  listingSchema,
  type ListingData,
  type ListingValues,
} from "@/features/listings/schemas";
import { shrinkImage } from "@/lib/image-resize";

const FIELDS = [
  "title",
  "commodity",
  "unit",
  "base_price_per_unit",
  "quantity",
  "min_order_quantity",
  "harvest_date",
  "description",
] as const;

function initialSlots(product?: Product): PhotoSlot[] {
  const urls = product ? productImages(product) : [];
  return [0, 1, 2].map((i) => (urls[i] ? { kind: "existing", url: urls[i] } : { kind: "empty" }));
}

type Props = {
  product?: Product;
  /** For field agents: the linked farmer this listing belongs to. */
  farmerUid?: string;
  backHref: string;
};

export function ListingForm({ product, farmerUid, backHref }: Props) {
  const router = useRouter();
  const save = useSaveListing(product?.id);
  const [slots, setSlots] = React.useState<PhotoSlot[]>(() => initialSlots(product));
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ListingValues, unknown, ListingData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: product?.title ?? "",
      commodity: product?.commodity ?? "",
      unit: product?.unit,
      base_price_per_unit: product?.base_price_per_unit ?? "",
      quantity: product?.quantity ?? "",
      min_order_quantity: product?.min_order_quantity ?? 1,
      harvest_date: product?.harvest_date ?? "",
      description: product?.description ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const form = new FormData();
    form.set("title", values.title);
    form.set("commodity", values.commodity ?? "");
    form.set("unit", values.unit);
    form.set("base_price_per_unit", values.base_price_per_unit.toFixed(2));
    form.set("quantity", String(values.quantity));
    form.set("min_order_quantity", String(values.min_order_quantity));
    if (values.harvest_date) form.set("harvest_date", values.harvest_date);
    form.set("description", values.description ?? "");
    if (farmerUid && !product) form.set("farmer", farmerUid);

    // Photos: empty or replaced slots that had a photo are removed; new files fill their slot.
    const original = initialSlots(product);
    const removed = original.flatMap((s, i) =>
      s.kind === "existing" && slots[i]?.kind !== "existing" ? [i] : [],
    );
    if (removed.length) form.set("remove_images", removed.join(","));
    for (const [i, slot] of slots.entries()) {
      if (slot.kind === "new") form.set(`image${i + 1}`, await shrinkImage(slot.file));
    }

    try {
      const saved = await save.mutateAsync(form);
      toast.success(product ? "Listing updated" : "Listing added");
      router.push(backHref as Route);
      router.refresh();
      return saved;
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  const err = (name: (typeof FIELDS)[number]) => errors[name]?.message;
  const input = (name: (typeof FIELDS)[number]) => ({
    id: name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": fieldDescribedBy(name, { error: err(name) }),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <FormAlert message={formError} />
      <section className="grid gap-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <h2 className="font-semibold">What are you selling?</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            htmlFor="title"
            label="Name"
            required
            error={err("title")}
            className="sm:col-span-2"
          >
            <Input
              placeholder="Red onions (90 kg bags)"
              {...input("title")}
              {...register("title")}
            />
          </Field>
          <Field
            htmlFor="commodity"
            label="Type of produce"
            hint="Used for search, e.g. onions"
            error={err("commodity")}
          >
            <Input placeholder="onions" {...input("commodity")} {...register("commodity")} />
          </Field>
          <Field htmlFor="unit" label="Sold per" required error={err("unit")}>
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="unit" aria-invalid={Boolean(errors.unit)}>
                    <SelectValue placeholder="Choose a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <h2 className="font-semibold">Price and stock</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            htmlFor="base_price_per_unit"
            label="Your price per unit (KSh)"
            required
            hint="Buyers see this plus 20% for delivery. VUNA keeps 8% of your price."
            error={err("base_price_per_unit")}
            className="sm:col-span-3"
          >
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              {...input("base_price_per_unit")}
              {...register("base_price_per_unit")}
            />
          </Field>
          <Field htmlFor="quantity" label="Available now" required error={err("quantity")}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              {...input("quantity")}
              {...register("quantity")}
            />
          </Field>
          <Field
            htmlFor="min_order_quantity"
            label="Minimum order"
            required
            error={err("min_order_quantity")}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              {...input("min_order_quantity")}
              {...register("min_order_quantity")}
            />
          </Field>
          <Field htmlFor="harvest_date" label="Harvest date" error={err("harvest_date")}>
            <Input type="date" {...input("harvest_date")} {...register("harvest_date")} />
          </Field>
        </div>
      </section>

      <section className="grid gap-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <h2 className="font-semibold">Photos and description</h2>
        <PhotoPicker slots={slots} onChange={setSlots} disabled={isSubmitting} />
        <p className="text-[13px] text-muted-foreground">
          Clear, daylight photos sell best. Photos are made smaller before upload.
        </p>
        <Field htmlFor="description" label="Description" error={err("description")}>
          <Textarea
            placeholder="Grade, size, how it's packed, when it can be collected…"
            {...input("description")}
            {...register("description")}
          />
        </Field>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push(backHref as Route)}>
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={isSubmitting}>
          {product ? "Save changes" : "Add listing"}
        </Button>
      </div>
    </form>
  );
}
