import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletEmail, NONCE_COOKIE } from "@/lib/auth/siwe";
import { checkRateLimit } from "@/lib/ratelimit";

// Verifies a SIWE signature and, on success, mints a Supabase session for the
// wallet's user. Flow: verify signature against the stored nonce → find or
// create the wallet's auth user (service role) → generate a one-time token
// the client exchanges for a real cookie-based session via verifyOtp.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const retryAfter = await checkRateLimit(ip, "auth");
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: { message?: unknown; signature?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.message !== "string" || typeof body.signature !== "string") {
    return NextResponse.json({ error: "Missing message or signature." }, { status: 400 });
  }

  const expectedNonce = cookies().get(NONCE_COOKIE)?.value;
  if (!expectedNonce) {
    return NextResponse.json(
      { error: "Your sign-in request expired. Please try again." },
      { status: 400 },
    );
  }

  // Verify the signature and that it used our nonce.
  let address: string;
  try {
    const siwe = new SiweMessage(body.message);
    const result = await siwe.verify({
      signature: body.signature,
      nonce: expectedNonce,
    });
    if (!result.success) throw new Error("verification failed");
    address = result.data.address.toLowerCase();
  } catch {
    return NextResponse.json({ error: "Signature verification failed." }, { status: 401 });
  }

  const admin = createAdminClient();
  const email = walletEmail(address);

  // Find or create the auth user for this wallet.
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("wallet_address", address)
    .maybeSingle();

  if (!existing) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { wallet_address: address },
    });
    // Ignore "already registered" races; any other error is fatal.
    if (createErr && !/already/i.test(createErr.message)) {
      console.error("[api/auth/siwe] createUser", createErr);
      return NextResponse.json({ error: "Could not sign you in." }, { status: 500 });
    }
  }

  // Mint a one-time token the client exchanges for a session.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    console.error("[api/auth/siwe] generateLink", linkErr);
    return NextResponse.json({ error: "Could not sign you in." }, { status: 500 });
  }

  // Clear the used nonce.
  const res = NextResponse.json({
    email,
    tokenHash: link.properties.hashed_token,
  });
  res.cookies.delete(NONCE_COOKIE);
  return res;
}
