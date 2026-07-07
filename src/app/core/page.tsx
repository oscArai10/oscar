import { Users, Coins, Crown, Network, ShieldCheck, Activity } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { getCoreOverview } from "@/lib/core/data";

export default async function CoreOverviewPage() {
  const data = await getCoreOverview();

  const activityItems = data.recentActivity.map((a) => ({
    id: a.id,
    icon: a.kind === "deploy" ? Coins : ShieldCheck,
    iconColor: a.kind === "deploy" ? "#2563EB" : "#9333EA",
    text: a.text,
    timeAgo: a.timeAgo,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-bold text-text-primary">
          oscAr CORE — Overview
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Platform-wide totals across every user. Only visible to owner accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          iconColor="#2563EB"
          label="Total Users"
          value={data.totalUsers}
          subLabel="Signed up"
        />
        <StatCard
          icon={Coins}
          iconColor="#22C55E"
          label="Total Deployments"
          value={data.totalDeployments}
          subLabel="All users, all chains"
        />
        <StatCard
          icon={Crown}
          iconColor="#F59E0B"
          label="Mainnet Deployments"
          value={data.totalMainnetDeployments}
          subLabel="Real, non-testnet"
        />
        <StatCard
          icon={Network}
          iconColor="#9333EA"
          label="Chains Used"
          value={`${data.distinctChains} / 10`}
          subLabel="Across all users"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Average Security Score">
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <p className="font-heading text-5xl font-bold text-text-primary">
              {data.avgAuditScore ?? "—"}
            </p>
            <p className="text-sm text-text-muted">
              {data.auditCount > 0
                ? `Across ${data.auditCount} audit${data.auditCount === 1 ? "" : "s"}, all users`
                : "No audits run yet"}
            </p>
          </div>
        </Card>

        <Card title="Platform Activity">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-status-green">
            <Activity size={14} />
            Real-time across all users
          </div>
          <ActivityFeed
            items={activityItems}
            emptyMessage="No deployments or audits yet across any user."
          />
        </Card>
      </div>
    </div>
  );
}
