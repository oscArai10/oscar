import { NextRequest, NextResponse } from "next/server";
import { verifyPaddleWebhookSignature } from "@/lib/billing/paddleClient";
import { createAdminClient } from "@/lib/supabase/admin";

// Paddle Billing webhook — the ONLY place a profile's tier/paddle_* columns
// are ever written (RLS blocks the user's own session from touching them;
// see supabase/schema.sql). Verifies the Paddle-Signature header against the
// raw body before trusting anything in the payload.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  if (!verifyPaddleWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event_type?: string;
    data?: {
      id?: string;
      status?: string;
      customer_id?: string;
      custom_data?: { app_user_id?: string } | null;
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type;
  const sub = event.data;
  if (!sub) return NextResponse.json({ received: true });

  const userId = sub.custom_data?.app_user_id;
  if (!userId) {
    // Nothing to map this event back to a profile — ignore, don't error
    // (Paddle retries on non-2xx, and this isn't a transient failure).
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  if (
    eventType === "subscription.created" ||
    eventType === "subscription.updated" ||
    eventType === "subscription.activated"
  ) {
    const active = sub.status === "active" || sub.status === "trialing";
    await supabase
      .from("profiles")
      .update({
        tier: active ? "pro" : "free",
        paddle_customer_id: sub.customer_id ?? null,
        paddle_subscription_id: sub.id ?? null,
        subscription_status: sub.status ?? null,
      })
      .eq("id", userId);
  } else if (
    eventType === "subscription.canceled" ||
    eventType === "subscription.paused"
  ) {
    await supabase
      .from("profiles")
      .update({
        tier: "free",
        subscription_status: sub.status ?? null,
      })
      .eq("id", userId);
  }

  return NextResponse.json({ received: true });
}
