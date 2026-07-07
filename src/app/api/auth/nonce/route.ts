import { NextRequest, NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { NONCE_COOKIE } from "@/lib/auth/siwe";
import { checkRateLimit } from "@/lib/ratelimit";

// Issues a one-time nonce for a SIWE sign-in and stores it in an httpOnly
// cookie so the verify route can confirm the signed message used it.
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const retryAfter = await checkRateLimit(ip, "auth");
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const nonce = generateNonce();
  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
  return res;
}
