import type { Metadata } from "next";

import { ProsePage } from "@/components/layout/prose-page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";

export const metadata: Metadata = { title: "Team", description: "The people building VUNA." };

const team = [
  {
    name: "Joel Nguru",
    role: "Project Lead · Finance & Impact",
    bio: "Grandson of smallholder farmers. Owns the vision, the numbers and investor conversations.",
  },
  {
    name: "Obera Michael",
    role: "Technical Lead",
    bio: "Owns the VUNA app: the farmer and buyer experience and the M-Pesa integration.",
  },
  {
    name: "Wahome Ian",
    role: "Operations & Partnerships",
    bio: "Owns the ground: cooperative relationships, logistics and onboarding buyers.",
  },
];

export default function TeamPage() {
  return (
    <ProsePage
      eyebrow="Team"
      title="We grew up inside this problem"
      intro="VUNA is built by people from farming families."
    >
      <ul className="grid gap-4 sm:grid-cols-3">
        {team.map((person) => (
          <li
            key={person.name}
            className="grid content-start gap-3 rounded-2xl border bg-card p-5 shadow-soft"
          >
            <Avatar className="size-12">
              <AvatarFallback>{initials(person.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{person.name}</p>
              <p className="text-[13px] text-primary">{person.role}</p>
            </div>
            <p className="text-sm text-muted-foreground">{person.bio}</p>
          </li>
        ))}
      </ul>
    </ProsePage>
  );
}
