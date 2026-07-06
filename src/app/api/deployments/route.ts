import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { OSCAR_CHAINS } from "@/lib/chains/chains";

/**
 * Persists a confirmed on-chain deployment for the signed-in user. Called
 * client-side by DeploySection right after a deployToken() transaction is
 * confirmed — the on-chain deploy has already succeeded by this point, so a
 * failure here never undoes it; it just means the dashboard won't show the
 * deployment until the user refreshes and the row eventually lands.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as {
    contract_name?: unknown;
    token_name?: unknown;
    token_symbol?: unknown;
    chain?: unknown;
    is_mainnet?: unknown;
    contract_address?: unknown;
    tx_hash?: unknown;
    audit_score?: unknown;
  };

  if (
    typeof b.contract_name !== "string" ||
    typeof b.token_name !== "string" ||
    typeof b.token_symbol !== "string" ||
    typeof b.chain !== "string" ||
    typeof b.is_mainnet !== "boolean" ||
    typeof b.contract_address !== "string" ||
    typeof b.tx_hash !== "string"
  ) {
    return NextResponse.json({ error: "Missing required deployment fields." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: "skipped" });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ status: "skipped" });
  }

  // chain key may be "<key>-testnet" (DeployableChainOption) — strip that
  // suffix to look up the base chain's explorer, but keep the full key as
  // the stored `chain` value so it round-trips back to the same option.
  const baseChainKey = b.chain.replace(/-testnet$/, "");
  const chainCfg = OSCAR_CHAINS[baseChainKey];
  const isTestnet = b.chain.endsWith("-testnet");
  const explorerBase = chainCfg
    ? (isTestnet ? chainCfg.testnet : chainCfg.chain).blockExplorers?.default.url
    : undefined;

  const { error } = await supabase.from("deployments").insert({
    user_id: user.id,
    contract_name: b.contract_name,
    token_name: b.token_name,
    token_symbol: b.token_symbol,
    chain: b.chain,
    is_mainnet: b.is_mainnet,
    status: "active",
    audit_score: typeof b.audit_score === "number" ? b.audit_score : null,
    contract_address: b.contract_address,
    tx_hash: b.tx_hash,
    explorer_url: explorerBase ? `${explorerBase}/token/${b.contract_address}` : null,
  });

  if (error) {
    console.error("[api/deployments] insert failed", error);
    return NextResponse.json({ error: "Could not save deployment." }, { status: 500 });
  }

  // Kick off explorer verification best-effort — never block the response
  // on it, and never let it fail the deployment record that already saved.
  const origin = req.nextUrl.origin;
  fetch(`${origin}/api/verify-contract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chainId: chainCfg
        ? (isTestnet ? chainCfg.testnet : chainCfg.chain).id
        : null,
      contractAddress: b.contract_address,
      txHash: b.tx_hash,
    }),
  }).catch(() => {
    /* best-effort */
  });

  return NextResponse.json({ status: "saved" });
}
