import { Sparkles, Link2, ShieldCheck, Wallet, Rocket, LayoutDashboard } from "lucide-react";

const FEATURES: { icon: typeof Sparkles; title: string; description: string }[] = [
  {
    icon: Sparkles,
    title: "AI-Generated Contracts",
    description:
      "Describe a token in plain language. oscAr AI writes a complete ERC20 on audited OpenZeppelin v5 bases — every owner power disclosed up front.",
  },
  {
    icon: Link2,
    title: "10+ EVM Chains",
    description:
      "Ethereum, Base, BNB Chain, Polygon, Arbitrum, Optimism, Avalanche, zkSync, Linea, Scroll — one contract, deploy anywhere.",
  },
  {
    icon: ShieldCheck,
    title: "Built-In Security Audits",
    description:
      "Slither static analysis plus an AI review, scored transparently out of 100. Mainnet deploy is blocked below a passing score.",
  },
  {
    icon: Wallet,
    title: "Non-Custodial, Always",
    description:
      "You deploy from your own wallet and pay your own gas. oscAr never holds your funds, your keys, or custody of anything.",
  },
  {
    icon: Rocket,
    title: "Memecoin Factory",
    description:
      "A guided builder for the fun stuff — vibe presets, tax sliders, anti-whale limits, and an anti-snipe launch gate.",
  },
  {
    icon: LayoutDashboard,
    title: "Real-Time Dashboard",
    description:
      "Track every deployment, audit score, and chain from oscAr PULSE — your control center for everything you've launched.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-20">
      <div className="text-center">
        <h2 className="font-heading text-3xl font-bold text-text-primary">
          Everything you need, nothing you don&apos;t
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
          From a single prompt to a live, audited contract — oscAr handles the
          parts that usually take a developer and an auditor.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass-card rounded-2xl p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-cyan">
              <f.icon size={20} />
            </div>
            <h3 className="mt-4 font-heading text-base font-bold text-text-primary">
              {f.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
