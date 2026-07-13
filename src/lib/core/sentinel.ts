import "server-only";
import { getAIHealthStatus } from "@/lib/ai/provider";
import { checkSlitherHealth } from "@/lib/audit/slitherClient";
import { paddleApiBase } from "@/lib/billing/paddleClient";
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

/** Live Etherscan V2 call — a free stats query whose response body
 *  distinguishes a working key ("status":"1") from a rejected one
 *  ("Invalid API Key"), so this validates the key, not just its presence. */
async function checkEtherscan(): Promise<HealthState> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return "not_configured";
  try {
    const res = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethsupply&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(RPC_TIMEOUT_MS) },
    );
    if (!res.ok) return "unreachable";
    const data = await res.json();
    if (data?.status === "1") return "healthy";
    return typeof data?.result === "string" && data.result.includes("Invalid API Key")
      ? "degraded"
      : "unreachable";
  } catch {
    return "unreachable";
  }
}

/** Live Paddle API call (sandbox/production per PADDLE_ENVIRONMENT) — GET
 *  /event-types is the cheapest authenticated endpoint; 401/403 means the
 *  key itself was rejected. A working server key with missing client-side
 *  checkout vars is reported degraded, since checkout still can't run.
 *  Returns its own detail: the two degraded causes need different advice. */
async function checkPaddle(): Promise<{ state: HealthState; detail: string }> {
  if (!process.env.PADDLE_API_KEY) {
    return {
      state: "not_configured",
      detail: "PADDLE_API_KEY not set — Pro checkout and the billing webhook are inactive.",
    };
  }
  try {
    const res = await fetch(`${paddleApiBase()}/event-types`, {
      headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return {
        state: "degraded",
        detail: "Key set but Paddle rejected it — check the key and PADDLE_ENVIRONMENT.",
      };
    }
    if (!res.ok) {
      return { state: "unreachable", detail: "Configured but the last API call failed." };
    }
    const checkoutReady =
      !!process.env.PADDLE_WEBHOOK_SECRET &&
      !!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
      !!process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO;
    return checkoutReady
      ? { state: "healthy", detail: "Key accepted and checkout vars present — billing is ready." }
      : {
          state: "degraded",
          detail:
            "API key works but checkout vars are missing (client token / price id / webhook secret).",
        };
  } catch {
    return { state: "unreachable", detail: "Configured but the last API call failed." };
  }
}

/** Validates the WalletConnect/Reown project id against the same explorer
 *  API RainbowKit itself uses. Anything that isn't a 32-hex id (like the
 *  current placeholder) is not_configured — wagmi.ts already runs
 *  extension-wallets-only in that state. */
async function checkWalletConnect(): Promise<HealthState> {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
  if (!/^[0-9a-f]{32}$/i.test(projectId)) return "not_configured";
  try {
    const res = await fetch(
      `https://explorer-api.walletconnect.com/v3/wallets?projectId=${projectId}&entries=1`,
      { signal: AbortSignal.timeout(RPC_TIMEOUT_MS) },
    );
    if (res.ok) return "healthy";
    return res.status === 400 || res.status === 401 || res.status === 403
      ? "degraded"
      : "unreachable";
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
  const [slither, alchemy, supabase, etherscan, paddle, walletconnect] = await Promise.all([
    checkSlitherHealth(),
    checkAlchemy(),
    checkSupabase(),
    checkEtherscan(),
    checkPaddle(),
    checkWalletConnect(),
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
    {
      id: "etherscan",
      label: "Etherscan (contract verification)",
      state: etherscan,
      detail:
        etherscan === "not_configured"
          ? "ETHERSCAN_API_KEY not set — deployed tokens aren't submitted for source verification."
          : etherscan === "degraded"
            ? "Key set but Etherscan rejected it — check the key."
            : etherscan === "unreachable"
              ? "Configured but the last API call failed."
              : "Key accepted — deployed tokens are submitted for verification.",
    },
    {
      id: "paddle",
      label: "Paddle (billing)",
      state: paddle.state,
      detail: paddle.detail,
    },
    {
      id: "walletconnect",
      label: "WalletConnect (mobile/QR wallets)",
      state: walletconnect,
      detail:
        walletconnect === "not_configured"
          ? "No real Reown project id (32-hex) set — extension wallets only until one is pasted."
          : walletconnect === "degraded"
            ? "Project id set but Reown rejected it — check it at cloud.reown.com."
            : walletconnect === "unreachable"
              ? "Configured but the validation call failed."
              : "Project id valid — mobile/QR wallet connections are enabled.",
    },
  ];

  return checks;
}
