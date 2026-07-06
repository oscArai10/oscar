"use client";

import { useState } from "react";
import type { DeployConfig } from "@/lib/ai/schemas";

export interface GeneratedContract {
  contract_name: string;
  token_name: string;
  token_symbol: string;
  solidity_code: string;
  summary: string;
  features: { name: string; description: string }[];
  warnings: string[];
  deploy_config: DeployConfig;
}

export type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "rejected"; reason: string }
  | { kind: "error"; message: string }
  | { kind: "done"; contract: GeneratedContract };

export interface AuditFinding {
  source: "static_analysis" | "ai_review";
  severity: "high" | "medium" | "low" | "informational";
  category: "security" | "gas" | "code_quality";
  title: string;
  plain_language: string;
}

export interface AuditReview {
  security_score: number;
  gas_score: number;
  code_quality_score: number;
  summary: string;
  findings: AuditFinding[];
}

export type AuditPhase =
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

/**
 * The generate → audit pipeline state shared by every factory surface
 * (Token Factory's free prompt, Memecoin Factory's guided builder). Both
 * call the same real /api/generate and /api/audit routes — the surfaces
 * only differ in how the prompt is composed.
 */
export function useContractPipeline() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [audit, setAudit] = useState<AuditPhase>({ kind: "idle" });

  async function generate(prompt: string) {
    const trimmed = prompt.trim();
    if (trimmed.length < 10 || phase.kind === "loading") return;
    setPhase({ kind: "loading" });
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

  return { phase, audit, generate, runAudit };
}
