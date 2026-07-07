import { MessageSquare, ScanSearch, Rocket } from "lucide-react";

const STEPS: { icon: typeof MessageSquare; title: string; description: string }[] = [
  {
    icon: MessageSquare,
    title: "1. Describe it",
    description:
      "Type what you want in plain English — supply, taxes, limits, owner powers. oscAr AI turns it into real Solidity.",
  },
  {
    icon: ScanSearch,
    title: "2. Review the audit",
    description:
      "Every contract gets a static-analysis + AI security review, scored out of 100, in plain language you can actually read.",
  },
  {
    icon: Rocket,
    title: "3. Deploy from your wallet",
    description:
      "Connect your own wallet, pick a chain, and deploy directly. oscAr never touches your funds or your keys.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-4">
      <div className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.title} className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-cyan">
              <s.icon size={22} />
            </div>
            <h3 className="mt-3 font-heading text-sm font-bold text-text-primary">
              {s.title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
