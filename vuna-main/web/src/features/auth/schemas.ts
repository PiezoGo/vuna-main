import { z } from "zod";

import { normalizeKePhone } from "@/lib/phone";

const phone = z
  .string()
  .trim()
  .refine(
    (v) => normalizeKePhone(v) !== null,
    "Enter a Kenyan mobile number, for example 0712 345 678.",
  );

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .refine((v) => !/^\d+$/.test(v), "Don't use only numbers.");

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const MARKETS = ["Muthurwa", "Wakulima", "Marikiti", "Other"] as const;
export const BUYER_TYPES = [
  { value: "hotel", label: "Hotel or restaurant" },
  { value: "retailer", label: "Retailer" },
  { value: "wholesaler", label: "Wholesaler" },
] as const;

export const signupSchema = z
  .object({
    role: z.enum(["farmer", "buyer"], { error: "Choose farmer or buyer." }),
    full_name: z.string().trim().min(2, "Enter your full name."),
    email: z.email("Enter a valid email address."),
    phone_number: phone,
    password,
    city: z.string().trim().min(2, "Enter your town or city."),
    market: z.string().optional(),
    buyer_type: z.enum(["hotel", "retailer", "wholesaler"]).optional(),
    cooperative: z.string().optional(),
  })
  .refine((v) => v.role !== "buyer" || Boolean(v.buyer_type), {
    path: ["buyer_type"],
    message: "Choose your business type.",
  });
export type SignupValues = z.infer<typeof signupSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current or one-time password."),
    new_password: password,
    confirm_password: z.string(),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "The passwords don't match.",
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name."),
  phone_number: phone,
  city: z.string().trim().optional(),
  market: z.string().optional(),
  bio: z.string().max(500, "Keep it under 500 characters.").optional(),
  buyer_type: z.enum(["hotel", "retailer", "wholesaler"]).optional(),
});
export type ProfileValues = z.infer<typeof profileSchema>;
