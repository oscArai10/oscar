import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting via Upstash Redis. When the Upstash env vars are empty
// (local dev before keys exist), limiting is skipped with a console warning —
// production deploys MUST have them set.

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn("[ratelimit] Upstash not configured — rate limiting DISABLED");
    limiter = null;
    return limiter;
  }
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    // Generation is expensive: 5 requests per 5 minutes per IP.
    limiter: Ratelimit.slidingWindow(5, "5 m"),
    prefix: "oscar:generate",
  });
  return limiter;
}

/** Returns null when allowed, or seconds-until-retry when limited. */
export async function checkRateLimit(identifier: string): Promise<number | null> {
  const l = getLimiter();
  if (!l) return null;
  const { success, reset } = await l.limit(identifier);
  if (success) return null;
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}
