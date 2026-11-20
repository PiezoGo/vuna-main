export const ROLES = ["farmer", "buyer", "driver", "admin", "agent"] as const;

export type Role = (typeof ROLES)[number];

export const roleLabels: Record<Role, string> = {
  farmer: "Farmer",
  buyer: "Buyer",
  driver: "Driver",
  admin: "Admin",
  agent: "Field agent",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
