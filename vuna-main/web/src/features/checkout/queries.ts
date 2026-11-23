"use client";

import type { DeliveryAddress } from "@vuna/api";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CartItem } from "@/features/cart/store";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

export const checkoutKeys = {
  quote: (items: CartItem[]) => ["quote", items] as const,
  addresses: ["addresses"] as const,
  checkouts: ["checkouts"] as const,
  checkout: (id: number) => ["checkouts", id] as const,
  incoming: ["farmer", "orders"] as const,
};

export function useQuote(items: CartItem[]) {
  return useQuery({
    queryKey: checkoutKeys.quote(items),
    queryFn: () => unwrap(clientApi.POST("/api/checkouts/quote/", { body: { items } })),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: checkoutKeys.addresses,
    queryFn: () => unwrap(clientApi.GET("/api/addresses/")),
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<DeliveryAddress, "id" | "created_at">) =>
      unwrap(clientApi.POST("/api/addresses/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: checkoutKeys.addresses }),
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      items: CartItem[];
      address: number;
      delivery_date: string;
      payment_choice: "pay_now" | "pay_after";
    }) => unwrap(clientApi.POST("/api/checkouts/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: checkoutKeys.checkouts }),
  });
}

/** Buyer's checkouts. Refreshes every 20 s so farmers' answers show up without reloading. */
export function useCheckouts() {
  return useQuery({
    queryKey: checkoutKeys.checkouts,
    queryFn: () => unwrap(clientApi.GET("/api/checkouts/")),
    refetchInterval: 20_000,
  });
}

export function useCheckout(id: number) {
  return useQuery({
    queryKey: checkoutKeys.checkout(id),
    queryFn: () => unwrap(clientApi.GET("/api/checkouts/{id}/", { params: { path: { id } } })),
    refetchInterval: 15_000,
  });
}

/** Sends the M-Pesa prompt for whatever is payable now. Returns the payment to poll. */
export function useStartPayment(checkoutId: number) {
  return useMutation({
    mutationFn: (phone: string) =>
      unwrap(
        clientApi.POST("/api/checkouts/{id}/pay/", {
          params: { path: { id: checkoutId } },
          body: { phone },
        }),
      ),
  });
}

/** Polls a payment every 3 s while the prompt is open on the buyer's phone. */
export function usePayment(paymentId: number | null) {
  return useQuery({
    queryKey: ["payments", paymentId],
    queryFn: () =>
      unwrap(clientApi.GET("/api/payments/{id}/", { params: { path: { id: paymentId ?? 0 } } })),
    enabled: paymentId !== null,
    refetchInterval: (query) => (query.state.data?.status === "requested" ? 3000 : false),
  });
}

export function useCancelLine(checkoutId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) =>
      unwrap(clientApi.POST("/api/orders/{id}/cancel/", { params: { path: { id: orderId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: checkoutKeys.checkout(checkoutId) }),
  });
}

/** Farmer: orders waiting for an answer first, then the rest. */
export function useIncomingOrders() {
  return useQuery({
    queryKey: checkoutKeys.incoming,
    queryFn: () => unwrap(clientApi.GET("/api/orders/")),
    refetchInterval: 30_000,
  });
}

export function useAnswerOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answer }: { id: number; answer: "accept" | "decline" }) =>
      answer === "accept"
        ? unwrap(clientApi.POST("/api/orders/{id}/accept/", { params: { path: { id } } }))
        : unwrap(clientApi.POST("/api/orders/{id}/decline/", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: checkoutKeys.incoming }),
  });
}
