"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
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
import type { AuditFinding, AuditPhase, Phase } from "./useContractPipeline";
import type { MainnetDeployLimitStatus } from "@/lib/billing/limits";

const SEVERITY_COLOR: Record<AuditFinding["severity"], string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#00D4FF",
  informational: "#94A3B8",
};

interface ContractPipelinePanelProps {
  phase: Phase;
  audit: AuditPhase;
  onRunAudit: () => void;
  /** Optional flavor line under the brain graphic while generating. */
  loadingSubtext?: string;
  mainnetLimitStatus: MainnetDeployLimitStatus | null;
}

/**
 * Everything downstream of "the user asked for a token": the brain-graphic
 * loading card, safety-rejection card, error card, generated-contract result
 * (Plain English / Solidity tabs), the security-audit section, and the
 * deploy section. Shared by the Token Factory and Memecoin Factory so both
 * surfaces get the identical, already-live-tested flow.
 */
export function ContractPipelinePanel({
  phase,
  audit,
  onRunAudit,
  loadingSubtext,
  mainnetLimitStatus,
}: ContractPipelinePanelProps) {
  const [tab, setTab] = useState<"summary" | "code">("summary");
  const [copied, setCopied] = useState(false);
  const contract = phase.kind === "done" ? phase.contract : null;

  // A fresh generation always lands on the Plain English tab.
  useEffect(() => {
    setTab("summary");
    setCopied(false);
  }, [contract]);

  async function copyCode() {
    if (!contract) return;
    await navigator.clipboard.writeText(contract.solidity_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
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
            {loadingSubtext ??
              "Safety check first, then your contract is written on audited OpenZeppelin bases. This can take a minute or two."}
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
                  onClick={onRunAudit}
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
          mainnetLimitStatus={mainnetLimitStatus}
        />
      )}
    </>
  );
}
