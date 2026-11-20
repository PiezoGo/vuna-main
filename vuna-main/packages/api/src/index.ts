export { createVunaClient, type CreateVunaClientOptions, type VunaClient } from "./client";
export type { components, operations, paths } from "./schema";

import type { components } from "./schema";

type Schemas = components["schemas"];

/** Friendly aliases for the generated schema types. */
export type User = Schemas["User"];
export type Product = Schemas["Product"];
export type PaginatedProducts = Schemas["PaginatedProductList"];
export type Order = Schemas["Order"];
export type OrderStatus = Schemas["OrderStatusEnum"];
export type ProductUnit = Schemas["ProductUnitEnum"];
export type UserRole = Schemas["UserRoleEnum"];
export type ChatMessage = Schemas["ChatMessage"];
export type Driver = Schemas["Driver"];
export type AuthResponse = Schemas["AuthResponse"];
export type PublicProfile = Schemas["PublicProfile"];
