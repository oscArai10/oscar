import "server-only";

// Client for the oscAr Slither audit microservice (services/slither/ —
// separate Docker service on Railway/Fly.io, since Slither is Python and
// cannot run inside Vercel functions). Internal API key auth, never exposed
// to the browser.

export interface SlitherFinding {
  check: string;
  impact: "High" | "Medium" | "Low" | "Informational" | "Optimization";
  confidence: string;
  description: string;
  line: number | null;
}

export type SlitherResult =
  | { status: "not_configured" }
  | { status: "unreachable" }
  | { status: "compile_error"; message: string }
  | { status: "ok"; findings: SlitherFinding[] };

const TIMEOUT_MS = 100_000;
const HEALTH_TIMEOUT_MS = 5_000;

export type SlitherHealth = "healthy" | "unreachable" | "not_configured";

/** Real live ping to the service's unauthenticated /health route — for
 *  SENTINEL's system health board, not for the audit path itself. */
export async function checkSlitherHealth(): Promise<SlitherHealth> {
  const url = process.env.SLITHER_SERVICE_URL;
  if (!url) return "not_configured";

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return res.ok ? "healthy" : "unreachable";
  } catch {
    return "unreachable";
  }
}

export async function analyzeContract(
  sourceCode: string,
  contractName: string,
): Promise<SlitherResult> {
  const url = process.env.SLITHER_SERVICE_URL;
  const apiKey = process.env.SLITHER_SERVICE_API_KEY;
  if (!url || !apiKey) {
    return { status: "not_configured" };
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": apiKey,
      },
      body: JSON.stringify({ source_code: sourceCode, contract_name: contractName }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error("[slither] service returned", res.status);
      return { status: "unreachable" };
    }

    const data = await res.json();
    if (!data.ok) {
      return {
        status: "compile_error",
        message: data.compile_error ?? "The contract failed to compile.",
      };
    }
    return { status: "ok", findings: data.findings ?? [] };
  } catch (err) {
    console.error("[slither] request failed", err);
    return { status: "unreachable" };
  }
}
