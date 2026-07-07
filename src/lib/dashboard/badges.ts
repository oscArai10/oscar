import "server-only";
import { Trophy, Layers, Boxes, Crown, Globe, Star, ShieldCheck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface BadgeDefinition {
  id: string;
  icon: typeof Trophy;
  label: string;
  description: string;
  earned: boolean;
}

interface BadgeStats {
  totalDeployments: number;
  mainnetDeployments: number;
  distinctChains: number;
  totalAudits: number;
  bestAuditScore: number | null;
}

const EMPTY_STATS: BadgeStats = {
  totalDeployments: 0,
  mainnetDeployments: 0,
  distinctChains: 0,
  totalAudits: 0,
  bestAuditScore: null,
};

/**
 * Real achievement stats for the signed-in user, derived from the same
 * deployments/audit_reports tables the dashboard already reads — never
 * fabricated. Uses exact counts (not a capped row list) so a user with
 * more than the dashboard's display limit still earns badges correctly.
 */
async function getBadgeStats(): Promise<BadgeStats> {
  if (!isSupabaseConfigured()) return EMPTY_STATS;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_STATS;

  const [totalRes, mainnetRes, chainsRes, auditsRes, bestScoreRes] = await Promise.all([
    supabase
      .from("deployments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("deployments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_mainnet", true),
    supabase.from("deployments").select("chain").eq("user_id", user.id),
    supabase
      .from("audit_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("audit_reports")
      .select("overall_score")
      .eq("user_id", user.id)
      .order("overall_score", { ascending: false })
      .limit(1),
  ]);

  const distinctChains = new Set((chainsRes.data ?? []).map((r) => r.chain)).size;

  return {
    totalDeployments: totalRes.count ?? 0,
    mainnetDeployments: mainnetRes.count ?? 0,
    distinctChains,
    totalAudits: auditsRes.count ?? 0,
    bestAuditScore: bestScoreRes.data?.[0]?.overall_score ?? null,
  };
}

export async function getBadges(): Promise<BadgeDefinition[]> {
  const stats = await getBadgeStats();

  return [
    {
      id: "first-deploy",
      icon: Trophy,
      label: "First Deploy",
      description: "Deploy your first token, on any chain.",
      earned: stats.totalDeployments >= 1,
    },
    {
      id: "security-conscious",
      icon: ShieldCheck,
      label: "Security Conscious",
      description: "Run your first audit before deploying.",
      earned: stats.totalAudits >= 1,
    },
    {
      id: "mainnet-pioneer",
      icon: Crown,
      label: "Mainnet Pioneer",
      description: "Deploy a token to a real mainnet.",
      earned: stats.mainnetDeployments >= 1,
    },
    {
      id: "five-tokens",
      icon: Layers,
      label: "5 Tokens Launched",
      description: "Deploy 5 tokens total, testnet or mainnet.",
      earned: stats.totalDeployments >= 5,
    },
    {
      id: "multi-chain",
      icon: Globe,
      label: "Multi-Chain Deployer",
      description: "Deploy on 3 or more different chains.",
      earned: stats.distinctChains >= 3,
    },
    {
      id: "perfect-audit",
      icon: Star,
      label: "Perfect Audit Score",
      description: "Score a perfect 100/100 on a security audit.",
      earned: stats.bestAuditScore === 100,
    },
    {
      id: "ten-tokens",
      icon: Boxes,
      label: "10 Tokens Launched",
      description: "Deploy 10 tokens total, testnet or mainnet.",
      earned: stats.totalDeployments >= 10,
    },
  ];
}
