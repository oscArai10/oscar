import { Fuel } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface GasPriceEntry {
  chain: string;
  gwei: number;
}

interface GasPriceWidgetProps {
  entries: GasPriceEntry[];
}

/** Live gas prices via Alchemy `eth_gasPrice` (see lib/dashboard/gasPrices).
 *  A single snapshot has no trend direction, so none is shown — just the
 *  real current price per chain, or an honest empty state when Alchemy
 *  isn't configured. */
export function GasPriceWidget({ entries }: GasPriceWidgetProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Fuel size={16} className="text-status-gold" />
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-accent-cyan-blue">
          Gas Prices
        </h2>
      </div>
      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          Live gas prices are unavailable right now.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {entries.map((entry) => (
            <div
              key={entry.chain}
              className="flex flex-col gap-1 rounded-lg border border-neon bg-bg-card px-3 py-2"
            >
              <span className="truncate text-xs text-text-muted">{entry.chain}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-sm font-semibold text-text-primary">
                  {entry.gwei}
                </span>
                <span className="text-[10px] text-text-muted">gwei</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
