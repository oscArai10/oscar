"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Wallet, Mail, Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildSiweMessage } from "@/lib/auth/siwe";
import { cn } from "@/lib/utils/cn";

type Tab = "wallet" | "email";
type Busy = null | "wallet" | "password" | "magic" | "signup";

export function LoginClient({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  const [tab, setTab] = useState<Tab>("wallet");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function signInWithWallet() {
    setError(null);
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }
    setBusy("wallet");
    try {
      const { nonce } = await fetch("/api/auth/nonce").then((r) => r.json());
      const message = buildSiweMessage({
        address,
        chainId,
        nonce,
        domain: window.location.host,
        uri: window.location.origin,
      }).prepareMessage();

      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/auth/siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign-in failed.");

      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: "magiclink",
      });
      if (otpErr) throw otpErr;

      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet sign-in failed.");
    } finally {
      setBusy(null);
    }
  }

  async function emailPassword() {
    setError(null);
    setNotice(null);
    const supabase = createClient();
    if (mode === "signup") {
      setBusy("signup");
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      setBusy(null);
      if (err) return setError(err.message);
      // If confirmation is required, there's no active session yet.
      if (!data.session) {
        return setNotice("Check your email to confirm your account, then sign in.");
      }
      router.push(redirectTo);
      router.refresh();
    } else {
      setBusy("password");
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(null);
      if (err) return setError(err.message);
      router.push(redirectTo);
      router.refresh();
    }
  }

  async function magicLink() {
    setError(null);
    setNotice(null);
    if (!email) return setError("Enter your email first.");
    setBusy("magic");
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    setBusy(null);
    if (err) return setError(err.message);
    setNotice("Magic link sent — check your email to finish signing in.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card neon-glow w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="h-14 w-14 overflow-hidden rounded-xl">
            <Image
              src="/oscar-logo.webp"
              alt="oscAr"
              width={56}
              height={56}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">
              osc<span className="text-accent-cyan">A</span>r
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Non-custodial. No KYC. Your keys, always.
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg border border-neon bg-bg-card p-1">
          <TabButton active={tab === "wallet"} onClick={() => setTab("wallet")} icon={Wallet}>
            Wallet
          </TabButton>
          <TabButton active={tab === "email"} onClick={() => setTab("email")} icon={Mail}>
            Email
          </TabButton>
        </div>

        {tab === "wallet" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              Connect your wallet and sign a message to prove ownership. It costs
              no gas and never moves funds.
            </p>
            <button
              onClick={signInWithWallet}
              disabled={busy === "wallet"}
              className="flex items-center justify-center gap-2 rounded-lg bg-accent-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow disabled:opacity-50"
            >
              {busy === "wallet" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wallet size={16} />
              )}
              {isConnected ? "Sign in with wallet" : "Connect wallet"}
            </button>
            {isConnected && address && (
              <p className="text-center font-mono text-xs text-text-muted">
                {address.slice(0, 6)}…{address.slice(-4)} connected
              </p>
            )}
          </div>
        )}

        {tab === "email" && (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="rounded-lg border border-neon bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="rounded-lg border border-neon bg-bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            />
            <button
              onClick={emailPassword}
              disabled={busy === "password" || busy === "signup" || !email || !password}
              className="flex items-center justify-center gap-2 rounded-lg bg-accent-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow disabled:opacity-50"
            >
              {(busy === "password" || busy === "signup") && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setMode((m) => (m === "signin" ? "signup" : "signin"));
                  setError(null);
                  setNotice(null);
                }}
                className="text-text-muted hover:text-accent-cyan"
              >
                {mode === "signin" ? "Create an account" : "Have an account? Sign in"}
              </button>
              <button
                onClick={magicLink}
                disabled={busy === "magic"}
                className="flex items-center gap-1 text-text-muted hover:text-accent-cyan disabled:opacity-50"
              >
                {busy === "magic" && <Loader2 size={12} className="animate-spin" />}
                Email me a magic link
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-status-red/30 bg-status-red/5 px-3 py-2 text-xs text-status-red">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 rounded-lg border border-status-green/30 bg-status-green/5 px-3 py-2 text-xs text-status-green">
            {notice}
          </p>
        )}

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-text-muted hover:text-text-secondary"
        >
          <ArrowLeft size={12} />
          Back to home
        </Link>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Wallet;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-accent-blue/20 text-accent-cyan" : "text-text-muted hover:text-text-secondary",
      )}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}
