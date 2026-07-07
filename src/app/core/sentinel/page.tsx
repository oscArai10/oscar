import { Radar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import { getSentinelChecks } from "@/lib/core/sentinel";

export default async function SentinelPage() {
  const checks = await getSentinelChecks();
  const allHealthy = checks.every((c) => c.state === "healthy" || c.state === "not_configured");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-lg font-bold text-text-primary">
          <Radar size={20} className="text-accent-purple-bright" />
          SENTINEL — System Health
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Live status of every external service oscAr AI depends on. Checked fresh on every load —
          nothing here is cached or fabricated.
        </p>
      </div>

      <Card
        className={
          allHealthy
            ? "border-status-green/30 bg-status-green/5"
            : "border-status-gold/30 bg-status-gold/5"
        }
      >
        <p className={`text-sm font-semibold ${allHealthy ? "text-status-green" : "text-status-gold"}`}>
          {allHealthy
            ? "All configured systems are healthy."
            : "One or more systems need attention."}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {checks.map((check) => (
          <Card key={check.id}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold text-text-primary">{check.label}</h2>
              <StatusDot status={check.state} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">{check.detail}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
