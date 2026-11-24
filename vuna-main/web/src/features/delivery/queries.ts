"use client";

import type { DeliveryMessage, Order, TripStop } from "@vuna/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { checkoutKeys } from "@/features/checkout/queries";
import { clientApi } from "@/lib/api/client";
import { sendForm } from "@/lib/api/form-upload";
import { unwrap } from "@/lib/api/result";

/** Driver trips and stops, buyer confirmation and problem reports, and the delivery chat. */
export const deliveryKeys = {
  all: ["delivery"] as const,
  trips: ["delivery", "trips"] as const,
  stop: (id: number) => ["delivery", "stop", id] as const,
  awaiting: ["delivery", "awaiting"] as const,
  messages: (orderId: number) => ["delivery", "messages", orderId] as const,
};

export function useDriverTrips() {
  return useQuery({
    queryKey: deliveryKeys.trips,
    queryFn: () => unwrap(clientApi.GET("/api/driver/trips/")),
    refetchInterval: 60_000,
  });
}

export function useDriverStop(id: number) {
  return useQuery({
    queryKey: deliveryKeys.stop(id),
    queryFn: () => unwrap(clientApi.GET("/api/driver/orders/{id}/", { params: { path: { id } } })),
  });
}

export function useStopAction(id: number, action: "collect" | "deliver") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) =>
      sendForm<TripStop>("POST", `/api/driver/orders/${id}/${action}/`, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryKeys.all }),
  });
}

export function useAwaitingConfirmation(enabled: boolean) {
  return useQuery({
    queryKey: deliveryKeys.awaiting,
    queryFn: () => unwrap(clientApi.GET("/api/orders/awaiting-confirmation/")),
    enabled,
  });
}

/** Refresh everything a buyer sees about their orders after a delivery action. */
function invalidateBuyer(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: deliveryKeys.all }),
    queryClient.invalidateQueries({ queryKey: checkoutKeys.checkouts }),
  ]);
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(clientApi.POST("/api/orders/{id}/confirm/", { params: { path: { id } } })),
    onSuccess: () => invalidateBuyer(queryClient),
  });
}

export function useReportProblem(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => sendForm<Order>("POST", `/api/orders/${id}/problems/`, form),
    onSuccess: () => invalidateBuyer(queryClient),
  });
}

export function useDeliveryMessages(orderId: number, enabled = true) {
  return useQuery({
    queryKey: deliveryKeys.messages(orderId),
    queryFn: () =>
      unwrap(clientApi.GET("/api/orders/{id}/messages/", { params: { path: { id: orderId } } })),
    enabled,
    refetchInterval: 15_000,
  });
}

export function useSendMessage(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      unwrap(
        clientApi.POST("/api/orders/{id}/messages/", {
          params: { path: { id: orderId } },
          body: { message },
        }),
      ),
    onSuccess: (sent: DeliveryMessage) =>
      queryClient.setQueryData<DeliveryMessage[]>(deliveryKeys.messages(orderId), (old) => [
        ...(old ?? []),
        sent,
      ]),
  });
}
