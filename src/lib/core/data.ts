import "server-only";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils/time";

export interface CoreOverview {
  totalUsers: number;
  totalDeployments: number;
  totalMainnetDeployments: number;
  distinctChains: number;
  avgAuditScore: number | null;
  auditCount: number;
  recentActivity: { id: string; text: string; timeAgo: string; kind: "deploy" | "audit" }[];
}

const EMPTY_OVERVIEW: CoreOverview = {
  totalUsers: 0,
  totalDeployments: 0,
  totalMainnetDeployments: 0,
  distinctChains: 0,
  avgAuditScore: null,
  auditCount: 0,
  recentActivity: [],
};

/**
 * Platform-wide totals across every user — relies entirely on the
 * `profiles_select_own_or_owner` / `deployments_select_own_or_owner` /
 * `audit_reports_select_own_or_owner` RLS policies, which let an
 * authenticated is_owner() session read every row. No service-role client
 * needed; the CORE/PULSE split is enforced by the database, not this code.
 */
export async function getCoreOverview(): Promise<CoreOverview> {
  if (!isSupabaseConfigured()) return EMPTY_OVERVIEW;
  const supabase = await createClient();

  const [
    usersRes,
    totalDeploymentsRes,
    mainnetDeploymentsRes,
    chainsRes,
    recentDeploymentsRes,
    totalAuditsRes,
    auditScoresRes,
    recentAuditsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("deployments").select("id", { count: "exact", head: true }),
    supabase
      .from("deployments")
      .select("id", { count: "exact", head: true })
      .eq("is_mainnet", true),
    supabase.from("deployments").select("chain"),
    supabase
      .from("deployments")
      .select("id, token_name, chain, is_mainnet, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("audit_reports").select("id", { count: "exact", head: true }),
    supabase.from("audit_reports").select("overall_score"),
    supabase
      .from("audit_reports")
      .select("id, token_name, token_symbol, overall_score, passes_gate, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const deployments = recentDeploymentsRes.data ?? [];
  const audits = recentAuditsRes.data ?? [];
  const auditScores = auditScoresRes.data ?? [];

  const distinctChains = new Set((chainsRes.data ?? []).map((r) => r.chain)).size;
  const avgAuditScore =
    auditScores.length > 0
      ? Math.round(auditScores.reduce((sum, a) => sum + a.overall_score, 0) / auditScores.length)
      : null;

  const deployActivity = deployments.slice(0, 10).map((d) => ({
    id: `deploy-${d.id}`,
    text: `${d.token_name} deployed on ${d.chain}${d.is_mainnet ? " (mainnet)" : ""}`,
    timeAgo: formatRelativeTime(d.created_at),
    createdAt: d.created_at,
    kind: "deploy" as const,
  }));
  const auditActivity = audits.slice(0, 10).map((a) => ({
    id: `audit-${a.id}`,
    text: a.passes_gate
      ? `Audit passed — ${a.token_name ?? "contract"} (${a.overall_score}/100)`
      : `Mainnet blocked — ${a.token_name ?? "contract"} scored ${a.overall_score}/100`,
    timeAgo: formatRelativeTime(a.created_at),
    createdAt: a.created_at,
    kind: "audit" as const,
  }));

  const recentActivity = [...deployActivity, ...auditActivity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12)
    .map(({ id, text, timeAgo, kind }) => ({ id, text, timeAgo, kind }));

  return {
    totalUsers: usersRes.count ?? 0,
    totalDeployments: totalDeploymentsRes.count ?? 0,
    totalMainnetDeployments: mainnetDeploymentsRes.count ?? 0,
    distinctChains,
    avgAuditScore,
    auditCount: totalAuditsRes.count ?? 0,
    recentActivity,
  };
}

export interface CoreUserRow {
  id: string;
  email: string | null;
  displayName: string;
  role: "user" | "owner";
  tier: "free" | "pro";
  deploymentCount: number;
  lastActiveTimeAgo: string | null;
  createdAt: string;
}

export async function getCoreUsers(): Promise<CoreUserRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const [profilesRes, deploymentsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, wallet_address, display_name, role, tier, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("deployments").select("user_id, created_at").limit(2000),
  ]);

  const profiles = profilesRes.data ?? [];
  const deployments = deploymentsRes.data ?? [];

  const deployCountByUser = new Map<string, number>();
  const lastActiveByUser = new Map<string, string>();
  for (const d of deployments) {
    deployCountByUser.set(d.user_id, (deployCountByUser.get(d.user_id) ?? 0) + 1);
    const existing = lastActiveByUser.get(d.user_id);
    if (!existing || new Date(d.created_at) > new Date(existing)) {
      lastActiveByUser.set(d.user_id, d.created_at);
    }
  }

  return profiles.map((p) => {
    const lastActive = lastActiveByUser.get(p.id) ?? null;
    return {
      id: p.id,
      email: p.email,
      displayName:
        p.display_name ||
        p.email ||
        (p.wallet_address ? `${p.wallet_address.slice(0, 6)}…${p.wallet_address.slice(-4)}` : "Account"),
      role: p.role,
      tier: p.tier,
      deploymentCount: deployCountByUser.get(p.id) ?? 0,
      lastActiveTimeAgo: lastActive ? formatRelativeTime(lastActive) : null,
      createdAt: p.created_at,
    };
  });
}
