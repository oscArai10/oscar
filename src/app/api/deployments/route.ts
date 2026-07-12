import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OSCAR_CHAINS } from "@/lib/chains/chains";
import { proveDeployment } from "@/lib/contracts/proveDeployment";
import { checkRateLimit } from "@/lib/ratelimit";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

/**
 * Persists a confirmed on-chain deployment for the signed-in user. Called
 * client-side by DeploySection right after a deployToken() transaction is
 * confirmed — the on-chain deploy has already succeeded by this point, so a
 * failure here never undoes it; it just means the dashboard won't show the
 * deployment until the user refreshes and the row eventually lands.
 *
 * Nothing consequential is trusted from the client: the deployment is proven
 * on-chain via the factory's own TokenDeployed receipt log (proveDeployment —
 * handles EIP-7702/relayed transactions too), token name/symbol are taken
 * from that event rather than the body, is_mainnet is derived from the chain
 * key, a tx hash can only be claimed once across all users, and audit_score
 * is looked up server-side from the user's own audit history. This data feeds
 * achievement badges, CORE's admin stats, and the public token page, so the
 * proof fails CLOSED (no Alchemy key / RPC down → row rejected, not trusted).
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
    chain?: unknown;
    contract_address?: unknown;
    tx_hash?: unknown;
  };

  if (
    typeof b.contract_name !== "string" ||
    typeof b.chain !== "string" ||
    typeof b.contract_address !== "string" ||
    typeof b.tx_hash !== "string"
  ) {
    return NextResponse.json({ error: "Missing required deployment fields." }, { status: 400 });
  }
  if (!ADDRESS_RE.test(b.contract_address)) {
    return NextResponse.json({ error: "Malformed contract address." }, { status: 400 });
  }
  if (!TX_HASH_RE.test(b.tx_hash)) {
    return NextResponse.json({ error: "Malformed transaction hash." }, { status: 400 });
  }
  // chain key may be "<key>-testnet" (DeployableChainOption) — must match a
  // real chain this app actually knows about, not an arbitrary string.
  const baseChainKey = b.chain.replace(/-testnet$/, "");
  const chainCfg = OSCAR_CHAINS[baseChainKey];
  if (!chainCfg) {
    return NextResponse.json({ error: "Unknown chain." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const retryAfter = await checkRateLimit(ip, "deployments");
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: "skipped" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ status: "skipped" });
  }

  const isTestnet = b.chain.endsWith("-testnet");
  const explorerBase = (isTestnet ? chainCfg.testnet : chainCfg.chain).blockExplorers?.default.url;

  // On-chain proof: the tx receipt must contain the factory's own
  // TokenDeployed event for exactly this token address. Fails closed.
  const proof = await proveDeployment({
    chainKey: b.chain,
    txHash: b.tx_hash as `0x${string}`,
    contractAddress: b.contract_address as `0x${string}`,
  });
  if (!proof.ok) {
    return NextResponse.json({ error: proof.reason }, { status: proof.status });
  }

  // One row per on-chain deployment: without this, a second user could
  // re-claim someone else's (real, proven) transaction as their own. RLS
  // scopes a user's own query to their own rows, so this check needs the
  // service-role client to see across users.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("deployments")
      .select("id")
      .ilike("tx_hash", b.tx_hash)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "That deployment is already recorded." },
        { status: 409 },
      );
    }
  }

  // Real audit score, looked up server-side from this user's own audit
  // history — never trusted from the request body.
  const { data: latestAudit } = await supabase
    .from("audit_reports")
    .select("overall_score")
    .eq("user_id", user.id)
    .eq("contract_name", b.contract_name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("deployments").insert({
    user_id: user.id,
    contract_name: b.contract_name,
    // Name/symbol as actually emitted on-chain, not as claimed by the client.
    token_name: proof.tokenName,
    token_symbol: proof.tokenSymbol,
    chain: b.chain,
    is_mainnet: !isTestnet,
    status: "active",
    audit_score: latestAudit?.overall_score ?? null,
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
      chainId: (isTestnet ? chainCfg.testnet : chainCfg.chain).id,
      contractAddress: b.contract_address,
      txHash: b.tx_hash,
    }),
  }).catch(() => {
    /* best-effort */
  });

  return NextResponse.json({ status: "saved" });
}
