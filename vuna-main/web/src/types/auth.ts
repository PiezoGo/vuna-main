export const ROLES = ["farmer", "buyer", "driver", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const roleLabels: Record<Role, string> = {
  farmer: "Farmer",
  buyer: "Buyer",
  driver: "Driver",
  admin: "Admin",
};
