import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConversationView } from "@/components/chat/conversation-view";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Conversation" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConversationPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const user = await requireUser(`/messages/${uid}`);
  if (!UUID.test(uid) || uid === user.uid) notFound();
  return (
    <section className="container-page max-w-3xl py-4 sm:py-8">
      <ConversationView uid={uid} myId={user.uid} />
    </section>
  );
}
