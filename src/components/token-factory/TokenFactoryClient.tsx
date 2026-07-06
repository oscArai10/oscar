"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Send,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  FileCode2,
  BookOpenText,
  ScanSearch,
  Lock,
  Unlock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { DeploySection } from "./DeploySection";
import { cn } from "@/lib/utils/cn";
import type { DeployConfig } from "@/lib/ai/schemas";

const QUICK_CHIPS: { label: string; prompt: string }[] = [
  {
    label: "Memecoin",
    prompt:
      "Create a memecoin called MoonDog, symbol MOON, 1 billion supply, 2% buy tax, anti-bot protection",
  },
  {
    label: "Utility Token",
    prompt:
      "Create a utility token called BuildCredit, symbol BLD, 100 million supply, mintable and burnable by the owner, pausable",
  },
  {
    label: "Tax Token",
    prompt:
      "Create a token called YieldFuel, symbol YFL, 500 million supply, 3% buy tax and 5% sell tax sent to a treasury wallet, max wallet 2%",
  },
  {
    label: "Fair Launch",
    prompt:
      "Create a fair launch token called FairPlay, symbol FAIR, 10 million fixed supply, no owner powers at all, no taxes",
  },
];

interface GeneratedContract {
  contract_name: string;
  token_name: string;
  token_symbol: string;
  solidity_code: string;
  summary: string;
  features: { name: string; description: string }[];
  warnings: string[];
  deploy_config: DeployConfig;
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "rejected"; reason: string }
  | { kind: "error"; message: string }
  | { kind: "done"; contract: GeneratedContract };

interface AuditFinding {
  source: "static_analysis" | "ai_review";
  severity: "high" | "medium" | "low" | "informational";
  category: "security" | "gas" | "code_quality";
  title: string;
  plain_language: string;
}

interface AuditReview {
  security_score: number;
  gas_score: number;
  code_quality_score: number;
  summary: string;
  findings: AuditFinding[];
}

type AuditPhase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "unavailable"; message: string }
  | { kind: "compile_error"; message: string }
  | { kind: "error"; message: string }
  | {
      kind: "completed";
      review: AuditReview;
      overallScore: number;
      passesGate: boolean;
    };

const SEVERITY_COLOR: Record<AuditFinding["severity"], string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#00D4FF",
  informational: "#94A3B8",
};

export function TokenFactoryClient({ initialPrompt }: { initialPrompt?: string }) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [tab, setTab] = useState<"summary" | "code">("summary");
  const [copied, setCopied] = useState(false);
  const [audit, setAudit] = useState<AuditPhase>({ kind: "idle" });

  async function generate() {
    const trimmed = prompt.trim();
    if (trimmed.length < 10 || phase.kind === "loading") return;
    setPhase({ kind: "loading" });
    setTab("summary");
    setAudit({ kind: "idle" });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();
      if (res.status === 422 && data.status === "rejected") {
        setPhase({ kind: "rejected", reason: data.reason });
      } else if (!res.ok) {
        setPhase({
          kind: "error",
          message: data.error ?? "Something went wrong. Please try again.",
        });
      } else {
        setPhase({ kind: "done", contract: data.contract });
      }
    } catch {
      setPhase({
        kind: "error",
        message: "Could not reach oscAr. Check your connection and try again.",
      });
    }
  }

  async function copyCode() {
    if (phase.kind !== "done") return;
    await navigator.clipboard.writeText(phase.contract.solidity_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function runAudit() {
    if (phase.kind !== "done" || audit.kind === "loading") return;
    setAudit({ kind: "loading" });
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solidity_code: phase.contract.solidity_code,
          contract_name: phase.contract.contract_name,
          token_name: phase.contract.token_name,
          token_symbol: phase.contract.token_symbol,
        }),
      });
      const data = await res.json();
      if (data.status === "unavailable") {
        setAudit({ kind: "unavailable", message: data.error });
      } else if (data.status === "compile_error") {
        setAudit({ kind: "compile_error", message: data.error });
      } else if (!res.ok) {
        setAudit({ kind: "error", message: data.error ?? "Audit failed. Please try again." });
      } else {
        setAudit({
          kind: "completed",
          review: data.review,
          overallScore: data.overallScore,
          passesGate: data.passesGate,
        });
      }
    } catch {
      setAudit({
        kind: "error",
        message: "Could not reach the audit service. Check your connection and try again.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h1 className="font-heading text-lg font-bold text-text-primary">
          Token Factory
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Describe your token in plain language. oscAr AI generates a complete,
          audited-base ERC20 contract on OpenZeppelin — you review everything
          before it goes anywhere near a blockchain.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => setPrompt(chip.prompt)}
              className="rounded-full border border-neon bg-white/5 px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-neon bg-bg-card p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
            placeholder="Create a memecoin called MoonDog, 1B supply, 2% buy tax, anti-bot..."
            rows={3}
            maxLength={2000}
            className="w-full resize-none bg-transparent px-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-text-muted">
              {prompt.length}/2000 · Ctrl+Enter to generate
            </span>
            <button
              onClick={generate}
              disabled={prompt.trim().length < 10 || phase.kind === "loading"}
              className="flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={15} />
              Generate Contract
            </button>
          </div>
        </div>
      </Card>

      {phase.kind === "loading" && (
        <Card className="flex flex-col items-center gap-4 py-10">
          <Image
            src="/oscar-brain.png"
            alt="oscAr AI"
            width={187}
            height={218}
            className="h-36 w-auto animate-pulse mix-blend-screen [mask-image:radial-gradient(closest-side,black_58%,transparent_100%)]"
          />
          <p className="font-heading text-sm font-semibold text-accent-cyan-blue">
            oscAr AI is working…
          </p>
          <p className="max-w-sm text-center text-xs text-text-muted">
            Safety check first, then your contract is written on audited
            OpenZeppelin bases. This can take a minute or two.
          </p>
        </Card>
      )}

      {phase.kind === "rejected" && (
        <Card className="border-status-red/40">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-status-red" />
            <div>
              <h2 className="font-heading text-sm font-bold text-status-red">
                Request blocked by the safety filter
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{phase.reason}</p>
              <p className="mt-3 text-xs text-text-muted">
                oscAr never generates honeypots, hidden fees, or rug-enabling
                logic. Adjust your request and try again.
              </p>
            </div>
          </div>
        </Card>
      )}

      {phase.kind === "error" && (
        <Card className="border-status-gold/40">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-status-gold" />
            <p className="text-sm text-text-secondary">{phase.message}</p>
          </div>
        </Card>
      )}

      {phase.kind === "done" && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-status-green" />
              <div>
                <h2 className="font-heading text-base font-bold text-text-primary">
                  {phase.contract.token_name}{" "}
                  <span className="font-mono text-sm text-accent-cyan">
                    ${phase.contract.token_symbol}
                  </span>
                </h2>
                <p className="text-xs text-text-muted">
                  Contract: {phase.contract.contract_name}.sol · OpenZeppelin v5
                </p>
              </div>
            </div>
            <div className="flex gap-1 rounded-lg border border-neon bg-bg-card p-1">
              <button
                onClick={() => setTab("summary")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === "summary"
                    ? "bg-accent-blue/20 text-accent-cyan"
                    : "text-text-muted hover:text-text-secondary",
                )}
              >
                <BookOpenText size={13} />
                Plain English
              </button>
              <button
                onClick={() => setTab("code")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === "code"
                    ? "bg-accent-blue/20 text-accent-cyan"
                    : "text-text-muted hover:text-text-secondary",
                )}
              >
                <FileCode2 size={13} />
                Solidity Code
              </button>
            </div>
          </div>

          {tab === "summary" && (
            <div className="mt-5 flex flex-col gap-5">
              <div className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {phase.contract.summary}
              </div>

              {phase.contract.features.length > 0 && (
                <div>
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
                    Features included
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {phase.contract.features.map((f) => (
                      <li key={f.name} className="flex items-start gap-2 text-sm">
                        <Check size={15} className="mt-0.5 shrink-0 text-status-green" />
                        <span className="text-text-secondary">
                          <span className="font-semibold text-text-primary">
                            {f.name}:
                          </span>{" "}
                          {f.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {phase.contract.warnings.length > 0 && (
                <div className="rounded-xl border border-status-gold/30 bg-status-gold/5 p-4">
                  <h3 className="flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-wide text-status-gold">
                    <AlertTriangle size={14} />
                    Before you deploy
                  </h3>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {phase.contract.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-text-secondary">
                        · {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "code" && (
            <div className="relative mt-5">
              <button
                onClick={copyCode}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-neon bg-bg-card px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:text-accent-cyan"
              >
                {copied ? <Check size={13} className="text-status-green" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <pre className="max-h-[32rem] overflow-auto rounded-xl border border-neon bg-bg-primary p-4 font-mono text-xs leading-relaxed text-text-secondary">
                {phase.contract.solidity_code}
              </pre>
            </div>
          )}

          <div className="mt-5 border-t border-white/5 pt-4">
            {audit.kind === "idle" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-text-muted">
                  Run the security audit before deploying — Slither static
                  analysis + oscAr AI review, scored out of 100. A score below
                  80 blocks mainnet deploy (testnet stays free either way).
                </p>
                <button
                  onClick={runAudit}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-neon bg-white/5 px-4 py-2 text-sm font-semibold text-accent-cyan transition-colors hover:border-accent-cyan"
                >
                  <ScanSearch size={15} />
                  Run Security Audit
                </button>
              </div>
            )}

            {audit.kind === "loading" && (
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <ScanSearch size={16} className="animate-pulse text-accent-cyan" />
                Running static analysis and AI review — this can take a minute…
              </div>
            )}

            {audit.kind === "unavailable" && (
              <div className="flex items-start gap-3 rounded-xl border border-status-gold/30 bg-status-gold/5 p-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-status-gold" />
                <p className="text-sm text-text-secondary">{audit.message}</p>
              </div>
            )}

            {(audit.kind === "compile_error" || audit.kind === "error") && (
              <div className="flex items-start gap-3 rounded-xl border border-status-red/30 bg-status-red/5 p-4">
                <ShieldAlert size={18} className="mt-0.5 shrink-0 text-status-red" />
                <p className="text-sm text-text-secondary">{audit.message}</p>
              </div>
            )}

            {audit.kind === "completed" && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <ProgressRing
                    value={audit.review.security_score}
                    color="#2563EB"
                    label="Security"
                  />
                  <ProgressRing
                    value={audit.review.gas_score}
                    color="#9333EA"
                    label="Gas Efficiency"
                  />
                  <ProgressRing
                    value={audit.review.code_quality_score}
                    color="#22D3EE"
                    label="Code Quality"
                  />
                  <ProgressRing
                    value={audit.overallScore}
                    color={audit.passesGate ? "#22C55E" : "#EF4444"}
                    label="Overall"
                  />
                </div>

                <p className="text-sm text-text-secondary">{audit.review.summary}</p>

                {audit.review.findings.length > 0 && (
                  <div>
                    <h3 className="font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
                      Findings
                    </h3>
                    <ul className="mt-2 flex flex-col gap-2">
                      {audit.review.findings.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-lg border border-neon bg-bg-card px-3 py-2 text-sm"
                        >
                          <span
                            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: SEVERITY_COLOR[f.severity] }}
                          />
                          <span className="text-text-secondary">
                            <span
                              className="font-semibold uppercase"
                              style={{ color: SEVERITY_COLOR[f.severity] }}
                            >
                              {f.severity}
                            </span>{" "}
                            <span className="font-semibold text-text-primary">
                              {f.title}:
                            </span>{" "}
                            {f.plain_language}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold",
                    audit.passesGate
                      ? "border-status-green/30 bg-status-green/5 text-status-green"
                      : "border-status-red/30 bg-status-red/5 text-status-red",
                  )}
                >
                  {audit.passesGate ? <Unlock size={16} /> : <Lock size={16} />}
                  {audit.passesGate
                    ? `Mainnet unlocked — overall score ${audit.overallScore}/100`
                    : `Mainnet blocked — overall score ${audit.overallScore}/100 (needs ≥80). Testnet deploy is still free.`}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {phase.kind === "done" && (
        <DeploySection
          contractName={phase.contract.contract_name}
          tokenName={phase.contract.token_name}
          tokenSymbol={phase.contract.token_symbol}
          deployConfig={phase.contract.deploy_config}
          canDeployMainnet={audit.kind === "completed" && audit.passesGate}
          auditOverallScore={audit.kind === "completed" ? audit.overallScore : null}
        />
      )}
    </div>
  );
}
