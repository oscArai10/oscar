import { Coins, FlaskConical, ShieldCheck, Network, ExternalLink } from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { PulseAssistantCard } from "@/components/dashboard/PulseAssistantCard";
import { GasPriceWidget } from "@/components/dashboard/GasPriceWidget";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StatusDot } from "@/components/ui/StatusDot";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { LiveLineChart } from "@/components/ui/LiveLineChart";
import { ActivityFeed } from "@/components/ui/ActivityFeed";

// ---------------------------------------------------------------------------
// Placeholder data below. Wired to Supabase (deployments/audits) and Alchemy
// (gas prices) in build step 9 — this page exists pre-auth to validate the
// design system against the reference dashboard.
// ---------------------------------------------------------------------------

const recentDeployments = [
  { id: "1", name: "MoonDog", chain: "Base", status: "active" as const, score: 94 },
  { id: "2", name: "SafeYield", chain: "Ethereum", status: "active" as const, score: 88 },
  { id: "3", name: "TurboCat", chain: "Arbitrum", status: "pending" as const, score: 81 },
  { id: "4", name: "GhostToken", chain: "Polygon", status: "failed" as const, score: 62 },
];

const gasEntries = [
  { chain: "Ethereum", gwei: 18, trend: "down" as const },
  { chain: "Base", gwei: 1, trend: "down" as const },
  { chain: "BNB Chain", gwei: 3, trend: "up" as const },
  { chain: "Polygon", gwei: 42, trend: "up" as const },
  { chain: "Arbitrum", gwei: 1, trend: "down" as const },
];

const deploymentActivity = [3, 5, 4, 8, 12, 9, 14, 11, 16, 13, 10, 7];
const activityLabels = ["00:00", "06:00", "12:00", "18:00", "24:00"];

const auditActivity = [
  { id: "1", icon: ShieldCheck, iconColor: "#22C55E", text: "Audit passed — MoonDog (94/100)", timeAgo: "2 min ago" },
  { id: "2", icon: ShieldCheck, iconColor: "#22C55E", text: "Audit passed — SafeYield (88/100)", timeAgo: "12 min ago" },
  { id: "3", icon: Network, iconColor: "#22D3EE", text: "Testnet deploy — TurboCat on Arbitrum Sepolia", timeAgo: "25 min ago" },
  { id: "4", icon: ShieldCheck, iconColor: "#EF4444", text: "Mainnet blocked — GhostToken scored 62/100", timeAgo: "1 hr ago" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner
        userName="Guest"
        dateLabel="5 Jul 2026"
        dayLabel="Sunday"
        timeLabel="—"
        timezoneLabel="Local"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          iconColor="#2563EB"
          label="My Tokens Deployed"
          value={0}
          subLabel="0 mainnet"
          sparklineData={[1, 2, 2, 3, 3, 4, 4]}
        />
        <StatCard
          icon={FlaskConical}
          iconColor="#9333EA"
          label="Testnet Deploys"
          value={0}
          subLabel="Unlimited & free"
          sparklineData={[2, 3, 3, 5, 4, 6, 7]}
        />
        <StatCard
          icon={ShieldCheck}
          iconColor="#F59E0B"
          label="Avg Security Score"
          value="—"
          subLabel="No audits yet"
          sparklineData={[80, 82, 85, 84, 88, 90, 91]}
        />
        <StatCard
          icon={Network}
          iconColor="#22C55E"
          label="Chains Used"
          value="0 / 10"
          subLabel="EVM chains"
          sparklineData={[1, 1, 2, 2, 3, 3, 4]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PulseAssistantCard />
        </div>
        <Card title="Recent Deployments" viewAllHref="/dashboard/deployments">
          <DataTable
            keyFor={(row) => row.id}
            rows={recentDeployments}
            emptyMessage="No deployments yet — describe a token above to get started."
            columns={[
              { header: "Name", render: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
              { header: "Chain", render: (r) => r.chain },
              { header: "Status", render: (r) => <StatusDot status={r.status} /> },
              { header: "Score", align: "right", render: (r) => `${r.score}/100` },
            ]}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Audit Score Breakdown">
          <div className="grid grid-cols-2 gap-4">
            <ProgressRing value={92} color="#2563EB" label="Security" />
            <ProgressRing value={88} color="#9333EA" label="Gas Efficiency" />
            <ProgressRing value={95} color="#22D3EE" label="Code Quality" />
            <ProgressRing value={91} color="#22C55E" label="Overall" />
          </div>
        </Card>

        <Card
          title="Deployment Activity"
          className="relative"
        >
          <span className="absolute right-5 top-5 flex items-center gap-1.5 text-xs font-medium text-status-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-green" />
            Live
          </span>
          <LiveLineChart
            data={deploymentActivity}
            xLabels={activityLabels}
            yMax={20}
            yStep={5}
          />
        </Card>

        <Card title="Recent Audit Activity" viewAllHref="/dashboard/audits">
          <ActivityFeed items={auditActivity} />
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
