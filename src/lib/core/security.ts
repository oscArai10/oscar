import type { NextRequest } from "next/server";

// Shared helpers for oscAr CORE's optional defense-in-depth layers
// (OSCAR_CORE_ALLOWED_IPS / OSCAR_CORE_SECRET_KEY / OSCAR_CORE_OWNER_EMAIL).
// Uses Web Crypto (globalThis.crypto.subtle) rather than Node's `crypto`
// module so the same code runs in both the Edge middleware and the Node
// route handler that sets the verification cookie.

export const CORE_VERIFIED_COOKIE_NAME = "oscar_core_verified";
export const CORE_VERIFIED_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h — re-prompt after this

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * HMAC-SHA256(secret, "oscar-core:<userId>") — ties the cookie to both the
 * configured secret and the specific user, so it can't be replayed across
 * accounts and never stores the raw secret in the cookie itself.
 */
export async function computeCoreVerificationToken(secret: string, userId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`oscar-core:${userId}`));
  return toHex(signature);
}

/** Constant-time string comparison — avoids leaking match progress via timing. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Best-effort client IP from proxy headers. Vercel (and any reverse proxy)
 * sets x-forwarded-for; a bare `next dev` with no proxy in front of it won't,
 * so a configured allowlist only takes effect once deployed behind one.
 */
export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

/** True only when a non-empty allowlist is configured AND the IP is in it.
 *  A configured-but-unparseable list, or a missing IP, fails closed. */
export function isIpAllowed(ip: string | null, allowedIpsEnv: string): boolean {
  const allowed = allowedIpsEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return false; // set but unparseable — fail closed
  if (!ip) return false;
  return allowed.includes(ip);
}
