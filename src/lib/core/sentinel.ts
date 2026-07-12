import "server-only";
import { getAIHealthStatus } from "@/lib/ai/provider";
import { checkSlitherHealth } from "@/lib/audit/slitherClient";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type HealthState = "healthy" | "degraded" | "unreachable" | "not_configured";

export interface SentinelCheck {
  id: string;
  label: string;
  state: HealthState;
  detail: string;
}

const RPC_TIMEOUT_MS = 5_000;

/** Live eth_blockNumber ping against Alchemy — real reachability, not just
 *  an env var presence check. */
async function checkAlchemy(): Promise<HealthState> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return "not_configured";

  try {
    const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
    if (!res.ok) return "unreachable";
    const data = await res.json();
    return typeof data?.result === "string" ? "healthy" : "unreachable";
  } catch {
    return "unreachable";
  }
}

/** Real query against the signed-in owner's own Supabase session — if this
 *  page rendered at all we have a session, but this confirms the DB round
 *  trip itself, not just cookie presence. */
async function checkSupabase(): Promise<HealthState> {
  if (!isSupabaseConfigured()) return "not_configured";
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" });
    return error ? "unreachable" : "healthy";
  } catch {
    return "unreachable";
  }
}

/**
 * Real, live status for every external dependency oscAr AI relies on — no
 * fabricated "all systems operational" banner. Each check either reflects
 * real in-memory failover state (Claude/GPT-4o) or a real network ping
 * (Slither, Alchemy, Supabase) made at request time.
 */
export async function getSentinelChecks(): Promise<SentinelCheck[]> {
  const [slither, alchemy, supabase] = await Promise.all([
    checkSlitherHealth(),
    checkAlchemy(),
    checkSupabase(),
  ]);
  const ai = getAIHealthStatus();

  const checks: SentinelCheck[] = [
    {
      id: "claude",
      label: "Claude AI (primary)",
      state: !ai.claudeConfigured ? "not_configured" : ai.failedOver ? "degraded" : "healthy",
      detail: !ai.claudeConfigured
        ? "ANTHROPIC_API_KEY not set."
        : ai.failedOver
          ? `Failed over after ${ai.consecutiveClaudeFailures} consecutive failures — retried automatically every 60s.`
          : "Serving generation requests normally.",
    },
    {
      id: "gpt4o",
      label: "GPT-4o (failover)",
      state: ai.gpt4oConfigured ? "healthy" : "not_configured",
      detail: !ai.gpt4oConfigured
        ? "OPENAI_API_KEY not set — no fallback available if Claude goes down."
        : ai.failedOver
          ? "Currently serving generation requests (Claude failed over)."
          : "Standing by — Claude is healthy.",
    },
    {
      id: "slither",
      label: "Slither audit service",
      state: slither,
      detail:
        slither === "not_configured"
          ? "SLITHER_SERVICE_URL not set — mainnet deploys are blocked (audit gate fails closed)."
          : slither === "unreachable"
            ? "Configured but not responding — mainnet deploys are blocked (audit gate fails closed)."
            : "Reachable — real audits are running.",
    },
    {
      id: "supabase",
      label: "Supabase",
      state: supabase,
      detail:
        supabase === "not_configured"
          ? "Supabase keys not set."
          : supabase === "unreachable"
            ? "Configured but the last query failed."
            : "Reachable — auth, deployments, and audits are being recorded.",
    },
    {
      id: "alchemy",
      label: "Alchemy (chain RPC)",
      state: alchemy,
      detail:
        alchemy === "not_configured"
          ? "ALCHEMY_API_KEY not set — deploys and gas prices can't reach any chain."
          : alchemy === "unreachable"
            ? "Configured but the last RPC call failed."
            : "Reachable — live block data confirmed.",
    },
  ];

  return checks;
}
