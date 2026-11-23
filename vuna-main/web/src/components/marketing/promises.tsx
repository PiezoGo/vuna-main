import { BadgePercent, Clock, Truck } from "lucide-react";

const promises = [
  {
    icon: BadgePercent,
    figure: "92%",
    title: "of the asking price goes to the farmer",
    text: "VUNA's 8% fee is published, not hidden in the price.",
  },
  {
    icon: Clock,
    figure: "4 hours",
    title: "to pay farmers after pickup",
    text: "Paid by M-Pesa, so farmers can hand over produce with confidence.",
  },
  {
    icon: Truck,
    figure: "Included",
    title: "delivery in every price",
    text: "Trained drivers collect at the farm gate and deliver to your door.",
  },
];

export function Promises() {
  return (
    <section className="container-page py-14 sm:py-20">
      <ul className="grid gap-4 md:grid-cols-3">
        {promises.map(({ icon: Icon, figure, title, text }) => (
          <li key={title} className="rounded-2xl border bg-card p-6 shadow-soft">
            <Icon className="size-6 text-primary" aria-hidden />
            <p className="mt-4 font-display text-3xl font-semibold">{figure}</p>
            <p className="mt-1 font-semibold">{title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
