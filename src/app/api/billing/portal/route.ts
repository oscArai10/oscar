import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createPaddlePortalSession, isPaddleConfigured } from "@/lib/billing/paddleClient";
import { checkRateLimit } from "@/lib/ratelimit";

// Returns a Paddle customer-portal URL for the signed-in Pro user to manage
// or cancel their subscription. Free users (no paddle_customer_id yet) get a
// clear error rather than a broken portal link.
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured() || !isPaddleConfigured()) {
    return NextResponse.json({ error: "Billing isn't configured yet." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const retryAfter = await checkRateLimit(ip, "billing");
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("paddle_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.paddle_customer_id) {
    return NextResponse.json(
      { error: "No active subscription to manage yet." },
      { status: 400 },
    );
  }

  const url = await createPaddlePortalSession(profile.paddle_customer_id);
  if (!url) {
    return NextResponse.json({ error: "Could not reach the billing portal." }, { status: 502 });
  }

  return NextResponse.json({ url });
}
