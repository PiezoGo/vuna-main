const farmerSteps = [
  "Sign up and get checked by the VUNA team.",
  "List your produce at your own price.",
  "Accept the orders you can fill.",
  "Hand over to our driver and get paid by M-Pesa.",
];
const buyerSteps = [
  "Browse produce with prices that include delivery.",
  "Fill one cart from several farms.",
  "Pay by M-Pesa now, or after the farmers confirm.",
  "Receive it at your door and confirm delivery.",
];

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <ol className="mt-6 grid gap-4">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {index + 1}
            </span>
            <span className="pt-1">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="border-y bg-muted/40">
      <div className="container-page py-14 sm:py-20">
        <h2 className="text-center font-display text-3xl font-semibold sm:text-4xl">
          How VUNA works
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Steps title="For farmers" steps={farmerSteps} />
          <Steps title="For buyers" steps={buyerSteps} />
        </div>
      </div>
    </section>
  );
}
