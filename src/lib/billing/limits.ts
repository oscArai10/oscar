import "server-only";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { FREE_MAINNET_DEPLOYS_PER_MONTH } from "./plans";

export interface MainnetDeployLimitStatus {
  tier: "free" | "pro";
  usedThisMonth: number;
  limit: number | null; // null = unlimited (Pro)
  reachedLimit: boolean;
}

/**
 * Real usage against the placeholder Free-tier limit (see plans.ts) —
 * counts this calendar month's mainnet deployments for the signed-in user.
 * Pro is always unlimited. Returns a permissive default (unlimited) when
 * Supabase isn't configured or no one is signed in, since the deploy flow
 * itself already requires auth — this just avoids a false block.
 */
export async function getMainnetDeployLimitStatus(
  tier: "free" | "pro",
): Promise<MainnetDeployLimitStatus> {
  if (tier === "pro") {
    return { tier, usedThisMonth: 0, limit: null, reachedLimit: false };
  }
  if (!isSupabaseConfigured()) {
    return { tier, usedThisMonth: 0, limit: FREE_MAINNET_DEPLOYS_PER_MONTH, reachedLimit: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { tier, usedThisMonth: 0, limit: FREE_MAINNET_DEPLOYS_PER_MONTH, reachedLimit: false };
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("deployments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_mainnet", true)
    .gte("created_at", monthStart.toISOString());

  const usedThisMonth = count ?? 0;
  return {
    tier,
    usedThisMonth,
    limit: FREE_MAINNET_DEPLOYS_PER_MONTH,
    reachedLimit: usedThisMonth >= FREE_MAINNET_DEPLOYS_PER_MONTH,
  };
}
