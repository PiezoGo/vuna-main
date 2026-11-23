import { z } from "zod";

import { normalizeKePhone } from "@/lib/phone";

export const addressSchema = z.object({
  label: z.string().trim().min(2, "Give it a short name, e.g. Main kitchen.").max(60),
  contact_name: z.string().trim().min(2, "Who receives the delivery?").max(120),
  contact_phone: z
    .string()
    .trim()
    .refine(
      (v) => normalizeKePhone(v) !== null,
      "Enter a Kenyan mobile number, for example 0712 345 678.",
    ),
  area: z.string().trim().min(2, "Enter the town or neighbourhood.").max(120),
  details: z.string().trim().min(3, "Building, street or gate.").max(255),
  landmark: z.string().trim().max(255).optional(),
});
export type AddressValues = z.infer<typeof addressSchema>;

/** Tomorrow in Nairobi as YYYY-MM-DD: the earliest delivery date. */
export function earliestDeliveryDate(now = new Date()): string {
  const nairobi = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
  nairobi.setDate(nairobi.getDate() + 1);
  const y = nairobi.getFullYear();
  const m = String(nairobi.getMonth() + 1).padStart(2, "0");
  const d = String(nairobi.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
