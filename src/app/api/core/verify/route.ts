import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  CORE_VERIFIED_COOKIE_MAX_AGE,
  CORE_VERIFIED_COOKIE_NAME,
  computeCoreVerificationToken,
  timingSafeEqualStr,
} from "@/lib/core/security";

/**
 * Exchanges the CORE secret key (re-entered by the owner on /core/verify)
 * for the HMAC verification cookie the middleware requires on every /core
 * page. Only exists as an endpoint when OSCAR_CORE_SECRET_KEY is configured;
 * only a signed-in role=owner account (matching OSCAR_CORE_OWNER_EMAIL, when
 * that layer is also on) can attempt it, and attempts are rate limited as
 * strictly as the AI routes since this is a secret-guessing surface.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.OSCAR_CORE_SECRET_KEY;
  if (!secret) {
    // Layer not enabled — don't advertise the endpoint's existence.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const retryAfter = await checkRateLimit(ip, "core-verify");
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many attempts — try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  const ownerEmail = process.env.OSCAR_CORE_OWNER_EMAIL;
  if (ownerEmail && user.email?.toLowerCase() !== ownerEmail.trim().toLowerCase()) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  let body: { key?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.key !== "string" || !timingSafeEqualStr(body.key, secret)) {
    return NextResponse.json({ error: "That key isn't correct." }, { status: 401 });
  }

  const token = await computeCoreVerificationToken(secret, user.id);
  const response = NextResponse.json({ status: "verified" });
  response.cookies.set(CORE_VERIFIED_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CORE_VERIFIED_COOKIE_MAX_AGE,
  });
  return response;
}
