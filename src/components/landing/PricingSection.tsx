import Link from "next/link";
import { Check, X } from "lucide-react";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  PRO_PRICE_USD_PER_MONTH,
} from "@/lib/billing/plans";

export function PricingSection({ isAuthed }: { isAuthed: boolean }) {
  const ctaHref = isAuthed ? "/dashboard/settings" : "/login?redirect=%2Fdashboard%2Fsettings";

  return (
    <section id="pricing" className="mx-auto w-full max-w-4xl px-6 py-20">
      <div className="text-center">
        <h2 className="font-heading text-3xl font-bold text-text-primary">
          Simple pricing
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
          Testnet is always free, no matter what. Pro only matters once
          you&apos;re ready to ship to mainnet regularly.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-accent-cyan-blue">
            Free
          </h3>
          <p className="mt-2 font-heading text-3xl font-bold text-text-primary">$0</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {FREE_PLAN_FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-2 text-sm">
                {f.included ? (
                  <Check size={15} className="shrink-0 text-status-green" />
                ) : (
                  <X size={15} className="shrink-0 text-text-muted" />
                )}
                <span className={f.included ? "text-text-secondary" : "text-text-muted"}>
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={isAuthed ? "/dashboard" : "/login"}
            className="mt-6 block rounded-lg border border-neon bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
          >
            Get Started
          </Link>
        </div>

        <div className="glass-card rounded-2xl border-accent-purple-bright/30 p-6">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-accent-purple-bright">
            Pro
          </h3>
          <p className="mt-2 font-heading text-3xl font-bold text-text-primary">
            ${PRO_PRICE_USD_PER_MONTH}
            <span className="text-sm font-normal text-text-muted">/mo</span>
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {PRO_PLAN_FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-2 text-sm">
                <Check size={15} className="shrink-0 text-status-green" />
                <span className="text-text-secondary">{f.text}</span>
              </li>
            ))}
          </ul>
          <Link
            href={ctaHref}
            className="mt-6 block rounded-lg bg-accent-blue px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </section>
  );
}
