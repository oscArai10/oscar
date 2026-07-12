"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

/**
 * Step-up verification for oscAr CORE: when OSCAR_CORE_SECRET_KEY is set,
 * the middleware sends the owner here until /api/core/verify has issued the
 * HMAC cookie. Full-page navigation afterwards (not a client route push) so
 * the middleware re-evaluates with the fresh cookie.
 */
export default function CoreVerifyPage() {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/core/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        window.location.href = "/core";
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Verification failed.");
      setSubmitting(false);
    } catch {
      setError("Verification failed — try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-neon bg-bg-card p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-purple/20">
            <ShieldCheck size={20} className="text-accent-purple-bright" />
          </div>
          <h1 className="font-heading text-xl font-bold text-text-primary">CORE verification</h1>
        </div>
        <p className="mb-6 text-sm text-text-secondary">
          This area requires the CORE secret key on top of your owner sign-in. Enter it to
          continue — you&apos;ll stay verified for 12 hours.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="CORE secret key"
            autoFocus
            className="rounded-lg border border-white/10 bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-purple-bright focus:outline-none"
          />
          {error && <p className="text-sm text-status-red">{error}</p>}
          <button
            type="submit"
            disabled={!key || submitting}
            className="rounded-lg bg-accent-purple-bright px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Verifying…" : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
