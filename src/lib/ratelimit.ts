import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting via Upstash Redis, with an in-memory fallback.
//
// Upstash is the real limiter: it's shared across every serverless instance,
// so its counts are correct. When it's unconfigured or unreachable we fall
// back to a per-instance in-memory window rather than letting requests
// through unmetered — /api/generate spends real money on every call, so
// "no limiter" must never mean "no limit". The fallback is a mitigation, not
// an equivalent: each serverless instance keeps its own counts, so the
// effective ceiling is roughly (limit x instances). Configure Upstash in
// production.
//
// Separate named buckets per route group — a shared single bucket would mean
// a legitimate user's normal flow (get a nonce, sign in, generate, audit,
// deploy) could trip a single expensive-AI-call limit well before actually
// abusing anything.

type Bucket =
  | "generate"
  | "audit"
  | "deployments"
  | "verify-contract"
  | "auth"
  | "billing"
  | "core-verify";

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
  // Secret-guessing surface — keep as strict as the AI buckets.
  "core-verify": { limit: 5, window: "5 m" },
};

let redis: Redis | null | undefined;
const limiters = new Map<Bucket, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[ratelimit] Upstash not configured — falling back to per-instance in-memory limits",
    );
    redis = null;
    return redis;
  }
  redis = new Redis({ url, token });
  return redis;
}

// --- In-memory fallback (per instance) ---

const memoryHits = new Map<string, number[]>();
const MEMORY_SWEEP_THRESHOLD = 5_000;

function windowMs(window: `${number} ${"s" | "m" | "h"}`): number {
  const [count, unit] = window.split(" ") as [string, "s" | "m" | "h"];
  const unitMs = unit === "s" ? 1_000 : unit === "m" ? 60_000 : 3_600_000;
  return Number(count) * unitMs;
}

/** Drop entries whose whole window has elapsed, so the map can't grow without
 *  bound on a long-lived instance. */
function sweepMemory(now: number) {
  for (const [key, hits] of memoryHits) {
    const bucket = key.slice(0, key.indexOf(":")) as Bucket;
    const span = windowMs(BUCKET_CONFIG[bucket].window);
    const live = hits.filter((t) => now - t < span);
    if (live.length === 0) memoryHits.delete(key);
    else memoryHits.set(key, live);
  }
}

function checkMemoryLimit(identifier: string, bucket: Bucket): number | null {
  const { limit, window } = BUCKET_CONFIG[bucket];
  const span = windowMs(window);
  const now = Date.now();

  if (memoryHits.size > MEMORY_SWEEP_THRESHOLD) sweepMemory(now);

  const key = `${bucket}:${identifier}`;
  const hits = (memoryHits.get(key) ?? []).filter((t) => now - t < span);
  if (hits.length >= limit) {
    memoryHits.set(key, hits);
    // hits[0] is the oldest live request; the window frees up when it expires.
    return Math.max(1, Math.ceil((hits[0] + span - now) / 1000));
  }
  hits.push(now);
  memoryHits.set(key, hits);
  return null;
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
  // Unconfigured: limit in memory rather than not at all.
  if (!l) return checkMemoryLimit(identifier, bucket);
  try {
    const { success, reset } = await l.limit(identifier);
    if (success) return null;
    return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  } catch (err) {
    // Upstash configured but failing. Previously this threw and 500'd the
    // route; fall back to in-memory so an Upstash outage neither breaks the
    // app nor silently removes the limit.
    console.error("[ratelimit] Upstash call failed — using in-memory fallback", err);
    return checkMemoryLimit(identifier, bucket);
  }
}
