import { z } from "zod";

export const UNITS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "sack", label: "Sack" },
  { value: "piece", label: "Piece" },
  { value: "bunch", label: "Bunch" },
  { value: "litre", label: "Litre" },
] as const;

const positiveInt = (message: string) =>
  z.coerce.number<string | number>().int(message).min(1, message);

export const listingSchema = z.object({
  title: z.string().trim().min(3, "Give it a clear name, e.g. Red onions (90 kg bags).").max(255),
  commodity: z.string().trim().max(100).optional(),
  unit: z.enum(["kg", "sack", "piece", "bunch", "litre"], { error: "Choose how you sell it." }),
  base_price_per_unit: z.coerce
    .number<string | number>()
    .positive("Enter your price in shillings.")
    .max(10_000_000, "That price looks too high."),
  quantity: z.coerce
    .number<string | number>()
    .int("Whole numbers only.")
    .min(0, "Can't be negative."),
  min_order_quantity: positiveInt("At least 1."),
  harvest_date: z.string().optional(),
  description: z.string().trim().max(2000).optional(),
});

export type ListingValues = z.input<typeof listingSchema>;
export type ListingData = z.output<typeof listingSchema>;
