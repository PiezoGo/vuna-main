import type { Metadata } from "next";

import { InboxList } from "@/components/chat/inbox-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  return (
    <section className="container-page grid max-w-3xl gap-6 py-8 sm:py-10">
      <PageHeader
        title="Messages"
        description="Your conversations with farmers, buyers, drivers and VUNA."
      />
      <InboxList myId={user.uid} />
    </section>
  );
}
