import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting via Upstash Redis. When the Upstash env vars are empty
// (local dev before keys exist), limiting is skipped with a console warning —
// production deploys MUST have them set.
//
// Separate named buckets per route group — a shared single bucket would mean
// a legitimate user's normal flow (get a nonce, sign in, generate, audit,
// deploy) could trip a single expensive-AI-call limit well before actually
// abusing anything.

type Bucket = "generate" | "audit" | "deployments" | "verify-contract" | "auth" | "billing";

const BUCKET_CONFIG: Record<Bucket, { limit: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  // AI generation/audit are expensive (real LLM + Slither calls).
  generate: { limit: 5, window: "5 m" },
  audit: { limit: 5, window: "5 m" },
  // Cheap DB writes / read-mostly routes get a more generous allowance so
  // normal usage never trips them.
  deployments: { limit: 20, window: "5 m" },
  "verify-contract": { limit: 20, window: "5 m" },
  auth: { limit: 15, window: "5 m" },
  billing: { limit: 15, window: "5 m" },
};

let redis: Redis | null | undefined;
const limiters = new Map<Bucket, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn("[ratelimit] Upstash not configured — rate limiting DISABLED");
    redis = null;
    return redis;
  }
  redis = new Redis({ url, token });
  return redis;
}

function getLimiter(bucket: Bucket): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const cached = limiters.get(bucket);
  if (cached) return cached;
  const { limit, window } = BUCKET_CONFIG[bucket];
  const l = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `oscar:${bucket}`,
  });
  limiters.set(bucket, l);
  return l;
}

/** Returns null when allowed, or seconds-until-retry when limited. */
export async function checkRateLimit(
  identifier: string,
  bucket: Bucket = "generate",
): Promise<number | null> {
  const l = getLimiter(bucket);
  if (!l) return null;
  const { success, reset } = await l.limit(identifier);
  if (success) return null;
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}
