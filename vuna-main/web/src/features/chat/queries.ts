"use client";

import type { ChatLine, Conversation } from "@vuna/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationKeys } from "@/features/notifications/queries";
import { useLiveStore } from "@/features/realtime/store";
import { clientApi } from "@/lib/api/client";
import { unwrap } from "@/lib/api/result";

export const chatKeys = {
  all: ["chat"] as const,
  inbox: ["chat", "inbox"] as const,
  conversation: (uid: string) => ["chat", "conversation", uid] as const,
};

export function useInbox() {
  const connected = useLiveStore((s) => s.connected);
  return useQuery({
    queryKey: chatKeys.inbox,
    queryFn: () => unwrap(clientApi.GET("/api/messages/inbox/")),
    refetchInterval: connected ? false : 60_000,
  });
}

export function useConversation(uid: string) {
  const queryClient = useQueryClient();
  const connected = useLiveStore((s) => s.connected);
  return useQuery({
    queryKey: chatKeys.conversation(uid),
    queryFn: async () => {
      const data = await unwrap(
        clientApi.GET("/api/messages/with/{uid}/", { params: { path: { uid } } }),
      );
      // Opening a conversation marks it read: refresh the unread counts.
      void queryClient.invalidateQueries({ queryKey: notificationKeys.summary });
      void queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
      return data;
    },
    refetchInterval: connected ? false : 15_000,
  });
}

export function useSendChat(uid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      unwrap(
        clientApi.POST("/api/messages/with/{uid}/", {
          params: { path: { uid } },
          body: { message },
        }),
      ),
    onSuccess: (line: ChatLine) => {
      queryClient.setQueryData<Conversation>(chatKeys.conversation(uid), (old) =>
        old && !old.messages.some((m) => m.id === line.id)
          ? { ...old, messages: [...old.messages, line] }
          : old,
      );
      return queryClient.invalidateQueries({ queryKey: chatKeys.inbox });
    },
  });
}
