import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPromptBar } from "@/components/landing/LandingPromptBar";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingSection } from "@/components/landing/PricingSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default async function Home() {
  let isAuthed = false;
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthed = !!user;
  }

  return (
    <main className="flex min-h-screen flex-col">
      <LandingNav isAuthed={isAuthed} />

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pb-16 pt-12 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-cyan-blue">
          10 Chains · AI-Audited · Non-Custodial
        </p>
        <h1 className="font-heading text-4xl font-bold leading-tight text-text-primary sm:text-5xl">
          One Prompt. Deploy on{" "}
          <span className="text-accent-cyan">10+ Blockchains.</span>
        </h1>
        <p className="max-w-xl text-base text-text-secondary">
          Describe a token in plain language. oscAr AI writes an audited
          contract on OpenZeppelin v5, you review a plain-language security
          score, and you deploy from your own wallet. No code, no custody.
        </p>

        <LandingPromptBar isAuthed={isAuthed} />
      </section>

      <HowItWorks />
      <FeatureGrid />
      <PricingSection isAuthed={isAuthed} />
      <LandingFooter isAuthed={isAuthed} />
    </main>
  );
}
