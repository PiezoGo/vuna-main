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
export type Cooperative = Schemas["Cooperative"];
export type FarmerApproval = Schemas["FarmerApproval"];
export type RegisterRequest = Schemas["RegisterRequest"];
export type ProfileUpdateRequest = Schemas["ProfileUpdateRequest"];
export type ApprovalStatus = Schemas["ApprovalStatusEnum"];
export type BuyerType = Schemas["BuyerTypeEnum"];
export type FacetValue = Schemas["FacetValue"];
export type ProductFacets = Schemas["ProductFacets"];
export type Checkout = Schemas["Checkout"];
export type Quote = Schemas["Quote"];
export type QuoteLine = Schemas["QuoteLine"];
export type DeliveryAddress = Schemas["DeliveryAddress"];
export type PaymentChoice = Schemas["PaymentChoiceEnum"];
export type MpesaPayment = Schemas["MpesaPayment"];
export type FarmerSummary = Schemas["FarmerSummary"];
export type AgentFarmer = Schemas["AgentFarmer"];
