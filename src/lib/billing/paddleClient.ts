import "server-only";
import crypto from "crypto";

// Server-side Paddle Billing API client. PADDLE_API_KEY/PADDLE_WEBHOOK_SECRET
// are both still "placeholder" as of this build (see CLAUDE.md) — the owner
// needs a real Paddle sandbox account + Product/Price before checkout or the
// webhook can do anything real. Every function here fails gracefully rather
// than throwing when unconfigured, matching the Slither/Alchemy pattern.

export function paddleApiBase(): string {
  return process.env.PADDLE_ENVIRONMENT === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

export function isPaddleConfigured(): boolean {
  return !!process.env.PADDLE_API_KEY && !!process.env.PADDLE_WEBHOOK_SECRET;
}

/**
 * Verifies the Paddle-Signature header against the raw request body using
 * PADDLE_WEBHOOK_SECRET. Paddle's format is "ts=<unix>;h1=<hex hmac>" where
 * the HMAC is computed over "<ts>:<raw body>".
 */
export function verifyPaddleWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("=") as [string, string]),
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  // Constant-time compare — signatures are the same length (hex digest).
  return (
    expected.length === h1.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(h1))
  );
}

/**
 * Creates a Paddle customer-portal session so a Pro user can manage/cancel
 * their subscription. Returns null if Paddle isn't configured or the API
 * call fails — the caller shows a friendly "unavailable" state.
 */
export async function createPaddlePortalSession(customerId: string): Promise<string | null> {
  if (!isPaddleConfigured()) return null;

  try {
    const res = await fetch(`${paddleApiBase()}/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.urls?.general?.overview ?? null;
  } catch {
    return null;
  }
}
