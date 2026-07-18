import type { Metadata } from "next";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PricingSection } from "@/components/landing/PricingSection";

export const metadata: Metadata = {
  title: "Pricing — oscAr",
  description:
    "oscAr pricing. Testnet deploys, AI generation, and security audits are free. Pro unlocks unlimited mainnet deploys for $19/month.",
};

export default async function PricingPage() {
  let isAuthed = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthed = !!user;
  }

  return (
    <main className="flex min-h-screen flex-col">
      <LandingNav isAuthed={isAuthed} />
      <div className="flex-1">
        <PricingSection isAuthed={isAuthed} />
        <div className="mx-auto max-w-4xl px-6 pb-16">
          <p className="text-center text-xs text-text-muted">
            Prices are in US dollars. Payments are processed by Paddle, our
            merchant of record. Pro renews monthly until cancelled — see the{" "}
            <a href="/refunds" className="text-accent-cyan hover:underline">
              Refund Policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-accent-cyan hover:underline">
              Terms of Service
            </a>
            .
          </p>
        </div>
      </div>
      <LandingFooter isAuthed={isAuthed} />
    </main>
  );
}
