import { Coins, FlaskConical, ShieldCheck, ShieldAlert, Network, ExternalLink } from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { PulseAssistantCard } from "@/components/dashboard/PulseAssistantCard";
import { GasPriceWidget } from "@/components/dashboard/GasPriceWidget";
import { BadgesCard } from "@/components/dashboard/BadgesCard";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StatusDot } from "@/components/ui/StatusDot";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { LiveLineChart } from "@/components/ui/LiveLineChart";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { getCurrentUserProfile } from "@/lib/supabase/profile";
import { getDashboardData } from "@/lib/dashboard/data";
import { getBadges } from "@/lib/dashboard/badges";
import { getGasPrices } from "@/lib/dashboard/gasPrices";

const activityLabels = ["00:00", "06:00", "12:00", "18:00", "24:00"];

export default async function DashboardPage() {
  const [profile, data, badges, gasEntries] = await Promise.all([
    getCurrentUserProfile(),
    getDashboardData(),
    getBadges(),
    getGasPrices(),
  ]);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const dayLabel = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  const auditActivityItems = data.recentAuditActivity.map((a) => ({
    id: a.id,
    icon: a.passesGate ? ShieldCheck : ShieldAlert,
    iconColor: a.passesGate ? "#22C55E" : "#EF4444",
    text: a.text,
    timeAgo: a.timeAgo,
  }));

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner
        userName={profile?.displayName ?? "Guest"}
        dateLabel={dateLabel}
        dayLabel={dayLabel}
        timeLabel="—"
        timezoneLabel="UTC"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          iconColor="#2563EB"
          label="My Tokens Deployed"
          value={data.tokensDeployedMainnet}
          subLabel={`${data.tokensDeployedMainnet} mainnet`}
        />
        <StatCard
          icon={FlaskConical}
          iconColor="#9333EA"
          label="Testnet Deploys"
          value={data.testnetDeploys}
          subLabel="Unlimited & free"
        />
        <StatCard
          icon={ShieldCheck}
          iconColor="#F59E0B"
          label="Avg Security Score"
          value={data.avgSecurityScore ?? "—"}
          subLabel={data.auditCount > 0 ? `${data.auditCount} audit${data.auditCount === 1 ? "" : "s"}` : "No audits yet"}
          sparklineData={data.securityScoreTrend.length >= 2 ? data.securityScoreTrend : undefined}
        />
        <StatCard
          icon={Network}
          iconColor="#22C55E"
          label="Chains Used"
          value={`${data.chainsUsed} / 10`}
          subLabel="EVM chains"
        />
      </div>

      <BadgesCard badges={badges} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PulseAssistantCard />
        </div>
        <Card title="Recent Deployments" viewAllHref="/dashboard/deployments">
          <DataTable
            keyFor={(row) => row.id}
            rows={data.recentDeployments}
            emptyMessage="No deployments yet — describe a token above to get started."
            columns={[
              { header: "Name", render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
              { header: "Chain", render: (r) => r.chain },
              { header: "Status", render: (r) => <StatusDot status={r.status} /> },
              { header: "Score", align: "right", render: (r) => (r.score !== null ? `${r.score}/100` : "—") },
            ]}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Audit Score Breakdown">
          {data.latestAuditBreakdown ? (
            <div className="grid grid-cols-2 gap-4">
              <ProgressRing value={data.latestAuditBreakdown.security} color="#2563EB" label="Security" />
              <ProgressRing value={data.latestAuditBreakdown.gas} color="#9333EA" label="Gas Efficiency" />
              <ProgressRing value={data.latestAuditBreakdown.codeQuality} color="#22D3EE" label="Code Quality" />
              <ProgressRing value={data.latestAuditBreakdown.overall} color="#22C55E" label="Overall" />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-text-muted">
              No audits yet — run one from Token Factory.
            </p>
          )}
        </Card>

        <Card title="Deployment Activity" className="relative">
          <span className="absolute right-5 top-5 flex items-center gap-1.5 text-xs font-medium text-status-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-green" />
            Live
          </span>
          <LiveLineChart
            data={data.deploymentActivity}
            xLabels={activityLabels}
            yMax={20}
            yStep={5}
          />
        </Card>

        <Card title="Recent Audit Activity" viewAllHref="/dashboard/audits">
          <ActivityFeed
            items={auditActivityItems}
            emptyMessage="No audit activity yet — run one from Token Factory."
          />
        </Card>
      </div>

      <GasPriceWidget entries={gasEntries} />

      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <ExternalLink size={12} />
        All contract addresses link to their respective block explorer once verified.
      </p>
    </div>
  );
}
