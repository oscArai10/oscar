"use client";

import { useState } from "react";
import { Settings2, Loader2 } from "lucide-react";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not open the billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not reach the billing portal. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={openPortal}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg border border-neon bg-white/5 px-4 py-2.5 text-sm font-semibold text-accent-cyan transition-colors hover:border-accent-cyan disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Settings2 size={15} />}
        Manage Subscription
      </button>
      {error && <p className="text-xs text-status-gold">{error}</p>}
    </div>
  );
}
