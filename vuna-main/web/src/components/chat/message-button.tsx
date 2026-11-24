import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** "Message <name>": opens the conversation (sign-in is asked for if needed). */
export function MessageButton({
  uid,
  name,
  className,
}: {
  uid: string;
  name: string;
  className?: string;
}) {
  return (
    <Button variant="outline" asChild className={className}>
      <Link href={`/messages/${uid}` as Route}>
        <MessageSquare /> Message {name.split(" ")[0]}
      </Link>
    </Button>
  );
}
