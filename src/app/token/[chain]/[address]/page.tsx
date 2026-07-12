import { notFound } from "next/navigation";
import Image from "next/image";
import { ExternalLink, ShieldCheck, Calendar } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ chain: string; address: string }>;
}

/**
 * Public, unauthenticated token page — anyone with the link can view it,
 * same as viewing the contract on a block explorer. Uses the service-role
 * client deliberately: a deployed contract's address, chain, and audit
 * score are already public on-chain, so this is a narrow, justified public
 * read, not a bypass of the deployments table's normal per-user RLS.
 */
export default async function TokenPage({ params }: PageProps) {
  if (!isSupabaseConfigured()) notFound();

  const { chain, address } = await params;
  const admin = createAdminClient();
  const { data: deployment } = await admin
    .from("deployments")
    .select(
      "token_name, token_symbol, contract_name, chain, is_mainnet, contract_address, explorer_url, audit_score, created_at",
    )
    .eq("chain", chain)
    .ilike("contract_address", address)
    .maybeSingle();

  if (!deployment) notFound();

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="glass-card neon-glow rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-lg">
              <Image
                src="/oscar-logo.webp"
                alt="oscAr"
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-heading text-sm text-text-muted">Deployed via oscAr</span>
          </div>

          <h1 className="mt-6 font-heading text-3xl font-bold text-text-primary">
            {deployment.token_name}{" "}
            <span className="text-accent-cyan">${deployment.token_symbol}</span>
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {deployment.is_mainnet ? "Mainnet" : "Testnet"} · {deployment.chain} · {deployment.contract_name}.sol
          </p>

          <div className="mt-6 flex flex-col gap-4 rounded-xl border border-neon bg-bg-card p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Contract address</p>
              <p className="mt-1 break-all font-mono text-sm text-text-primary">
                {deployment.contract_address}
              </p>
            </div>
            {deployment.audit_score !== null && (
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-status-green" />
                <span className="text-sm text-text-secondary">
                  Security audit score: {deployment.audit_score}/100
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-text-muted" />
              <span className="text-sm text-text-secondary">
                Deployed {new Date(deployment.created_at).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {deployment.explorer_url && (
            <a
              href={deployment.explorer_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-accent-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow"
            >
              <ExternalLink size={16} />
              View on Block Explorer
            </a>
          )}

          <p className="mt-6 text-center text-xs text-text-muted">
            oscAr is non-custodial — this token was deployed directly from its
            creator&apos;s own wallet. oscAr never held funds and does not control
            this contract.
          </p>
        </div>
      </div>
    </main>
  );
}
