"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO;

interface PaddleCheckoutButtonProps {
  userId: string;
  email: string | null;
  className?: string;
}

/**
 * "Upgrade to Pro" button. Paddle.js is loaded lazily on click, not on every
 * page load. Gracefully explains itself rather than crashing when the owner
 * hasn't set up a real Paddle sandbox Product/Price yet (see CLAUDE.md).
 */
export function PaddleCheckoutButton({ userId, email, className }: PaddleCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = !!CLIENT_TOKEN && !!PRICE_ID;

  async function openCheckout() {
    if (!configured) {
      setError("Pro checkout isn't set up yet — the owner needs to create a Paddle Product/Price first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { initializePaddle } = await import("@paddle/paddle-js");
      const paddle = await initializePaddle({
        environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
        token: CLIENT_TOKEN!,
      });
      paddle?.Checkout.open({
        items: [{ priceId: PRICE_ID!, quantity: 1 }],
        customer: email ? { email } : undefined,
        customData: { app_user_id: userId },
      });
    } catch {
      setError("Could not open checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={openCheckout}
        disabled={loading}
        className={
          className ??
          "flex items-center justify-center gap-2 rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
        Upgrade to Pro
      </button>
      {error && <p className="text-xs text-status-gold">{error}</p>}
    </div>
  );
}
