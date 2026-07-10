import "server-only";
import { OSCAR_CHAINS } from "@/lib/chains/chains";

export interface GasPriceEntry {
  chain: string;
  gwei: number;
}

const RPC_TIMEOUT_MS = 4_000;

/** Round for display without ever collapsing a real nonzero price to "0" —
 *  L2 gas can be well below 0.001 gwei, so tiny values keep significant
 *  figures instead of rounding down to a misleading zero. */
function formatGwei(gwei: number): number {
  if (gwei >= 100) return Math.round(gwei);
  if (gwei >= 1) return Number(gwei.toFixed(1));
  if (gwei >= 0.001) return Number(gwei.toFixed(3));
  if (gwei > 0) return Number(gwei.toPrecision(2));
  return 0;
}

// Flagship chains first, then the rest. Only chains that actually respond are
// shown — a failed RPC is dropped, never shown as a fabricated number.
const DISPLAY_ORDER = [
  "ethereum",
  "base",
  "bnb",
  "polygon",
  "arbitrum",
  "optimism",
  "avalanche",
  "zksync",
  "linea",
  "scroll",
];

/**
 * Real per-chain gas prices via Alchemy `eth_gasPrice`. Returns an empty
 * array when `ALCHEMY_API_KEY` isn't set (the widget then shows an honest
 * "unavailable" state) — never fabricated numbers. Cached 30s so a busy
 * dashboard doesn't hammer 10 RPC endpoints on every render.
 */
export async function getGasPrices(): Promise<GasPriceEntry[]> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return [];

  const results = await Promise.all(
    DISPLAY_ORDER.map(async (key): Promise<GasPriceEntry | null> => {
      const cfg = OSCAR_CHAINS[key];
      if (!cfg) return null;
      try {
        const res = await fetch(`https://${cfg.alchemySlug}.g.alchemy.com/v2/${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }),
          signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
          next: { revalidate: 30 },
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (typeof data?.result !== "string") return null;
        const gwei = parseInt(data.result, 16) / 1e9;
        if (!Number.isFinite(gwei)) return null;
        return { chain: cfg.chain.name, gwei: formatGwei(gwei) };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((e): e is GasPriceEntry => e !== null);
}
