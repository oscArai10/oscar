import { NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { NONCE_COOKIE } from "@/lib/auth/siwe";

// Issues a one-time nonce for a SIWE sign-in and stores it in an httpOnly
// cookie so the verify route can confirm the signed message used it.
export async function GET() {
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
