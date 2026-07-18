import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

/**
 * Shared shell for the public legal pages (/terms, /privacy, /refunds) so
 * they share the landing page's nav, footer, and dark design system. Checks
 * auth once for the nav/footer CTAs, same as the landing page does.
 */
export async function LegalPageShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
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

      <article className="mx-auto w-full max-w-3xl px-6 pb-16 pt-8">
        <h1 className="font-heading text-3xl font-bold text-text-primary sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-accent-cyan-blue">
          Last updated: {lastUpdated}
        </p>
        <div className="legal-prose mt-8 flex flex-col gap-6 text-sm leading-relaxed text-text-secondary">
          {children}
        </div>
      </article>

      <div className="mt-auto">
        <LandingFooter isAuthed={isAuthed} />
      </div>
    </main>
  );
}

/** A titled section within a legal page. */
export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-bold text-text-primary">{heading}</h2>
      {children}
    </section>
  );
}
