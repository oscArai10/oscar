import "server-only";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils/time";

export interface DashboardDeploymentRow {
  id: string;
  name: string;
  chain: string;
  status: "active" | "pending" | "failed";
  score: number | null;
}

export interface DashboardAuditActivityItem {
  id: string;
  text: string;
  timeAgo: string;
  passesGate: boolean;
}

export interface DashboardData {
  tokensDeployedMainnet: number;
  testnetDeploys: number;
  chainsUsed: number;
  avgSecurityScore: number | null;
  auditCount: number;
  /** Chronological (oldest→newest) overall scores from recent audits, for a sparkline. */
  securityScoreTrend: number[];
  recentDeployments: DashboardDeploymentRow[];
  latestAuditBreakdown: {
    security: number;
    gas: number;
    codeQuality: number;
    overall: number;
  } | null;
  /** 12 buckets (2h each) of deployment counts over the last 24h, oldest→newest. */
  deploymentActivity: number[];
  recentAuditActivity: DashboardAuditActivityItem[];
}

const EMPTY_DATA: DashboardData = {
  tokensDeployedMainnet: 0,
  testnetDeploys: 0,
  chainsUsed: 0,
  avgSecurityScore: null,
  auditCount: 0,
  securityScoreTrend: [],
  recentDeployments: [],
  latestAuditBreakdown: null,
  deploymentActivity: new Array(12).fill(0),
  recentAuditActivity: [],
};

/**
 * Real dashboard data for the signed-in user. Returns the honest empty state
 * (all zeros / empty lists) when Supabase isn't configured, no one is signed
 * in, or the user genuinely has no deployments/audits yet — never fabricated
 * numbers.
 */
export async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured()) return EMPTY_DATA;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_DATA;

  const [deploymentsRes, auditsRes] = await Promise.all([
    supabase
      .from("deployments")
      .select("id, token_name, chain, is_mainnet, status, audit_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("audit_reports")
      .select(
        "id, token_name, token_symbol, security_score, gas_score, code_quality_score, overall_score, passes_gate, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const deployments = deploymentsRes.data ?? [];
  const audits = auditsRes.data ?? [];

  const tokensDeployedMainnet = deployments.filter((d) => d.is_mainnet).length;
  const testnetDeploys = deployments.filter((d) => !d.is_mainnet).length;
  const chainsUsed = new Set(deployments.map((d) => d.chain)).size;

  const avgSecurityScore =
    audits.length > 0
      ? Math.round(audits.reduce((sum, a) => sum + a.overall_score, 0) / audits.length)
      : null;

  // Chronological (oldest→newest) trend from the most recent audits — only
  // meaningful with at least 2 points, otherwise omit the sparkline entirely.
  const securityScoreTrend =
    audits.length >= 2
      ? [...audits]
          .slice(0, 7)
          .reverse()
          .map((a) => a.overall_score)
      : [];

  const recentDeployments: DashboardDeploymentRow[] = deployments.slice(0, 5).map((d) => ({
    id: d.id,
    name: d.token_name,
    chain: d.chain,
    status: (d.status as "active" | "pending" | "failed") ?? "pending",
    score: d.audit_score,
  }));

  const latest = audits[0];
  const latestAuditBreakdown = latest
    ? {
        security: latest.security_score,
        gas: latest.gas_score,
        codeQuality: latest.code_quality_score,
        overall: latest.overall_score,
      }
    : null;

  // Real hourly buckets (12 x 2h windows) over the last 24h. With no
  // deployments this is honestly all zeros, not a fabricated shape.
  const deploymentActivity = new Array(12).fill(0);
  const dayAgoMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const d of deployments) {
    const ageMs = now - new Date(d.created_at).getTime();
    if (ageMs < 0 || ageMs > dayAgoMs) continue;
    const bucketFromNow = Math.min(11, Math.floor(ageMs / (2 * 60 * 60 * 1000)));
    deploymentActivity[11 - bucketFromNow] += 1;
  }

  const recentAuditActivity: DashboardAuditActivityItem[] = audits.slice(0, 6).map((a) => {
    const label = a.token_name
      ? `${a.token_name}${a.token_symbol ? ` (${a.token_symbol})` : ""}`
      : "Untitled contract";
    const text = a.passes_gate
      ? `Audit passed — ${label} (${a.overall_score}/100)`
      : `Mainnet blocked — ${label} scored ${a.overall_score}/100`;
    return {
      id: a.id,
      text,
      timeAgo: formatRelativeTime(a.created_at),
      passesGate: a.passes_gate,
    };
  });

  return {
    tokensDeployedMainnet,
    testnetDeploys,
    chainsUsed,
    avgSecurityScore,
    auditCount: audits.length,
    securityScoreTrend,
    recentDeployments,
    latestAuditBreakdown,
    deploymentActivity,
    recentAuditActivity,
  };
}
