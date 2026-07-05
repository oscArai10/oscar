import { Fuel, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface GasPriceEntry {
  chain: string;
  gwei: number;
  trend: "up" | "down";
}

interface GasPriceWidgetProps {
  entries: GasPriceEntry[];
}

/** Live gas prices across all 10 launch chains via Alchemy — wired in build step 9. */
export function GasPriceWidget({ entries }: GasPriceWidgetProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Fuel size={16} className="text-status-gold" />
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-accent-cyan-blue">
          Gas Prices — 10 Chains
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {entries.map((entry) => (
          <div
            key={entry.chain}
            className="flex flex-col gap-1 rounded-lg border border-neon bg-bg-card px-3 py-2"
          >
            <span className="text-xs text-text-muted">{entry.chain}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-semibold text-text-primary">
                {entry.gwei}
              </span>
              <span className="text-[10px] text-text-muted">gwei</span>
              {entry.trend === "up" ? (
                <TrendingUp size={12} className="text-status-red" />
              ) : (
                <TrendingDown size={12} className="text-status-green" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
