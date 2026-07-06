import "server-only";
import { callOscarAI } from "@/lib/ai/provider";
import { AUDIT_REVIEWER_SYSTEM, auditReviewerUserMessage } from "@/lib/ai/prompts";
import { AUDIT_REVIEW_SCHEMA, type AuditReview } from "@/lib/ai/schemas";
import { analyzeContract, type SlitherFinding } from "./slitherClient";

// Score weighting for the mainnet gate. Security carries the most weight
// since it's the safety-critical dimension; gas/quality are secondary.
const WEIGHTS = { security: 0.5, gas: 0.25, quality: 0.25 };
export const MAINNET_GATE_SCORE = 80;

export type AuditResult =
  | { status: "unavailable" } // Slither service down/not configured — fail closed, block mainnet
  | { status: "compile_error"; message: string }
  | {
      status: "completed";
      review: AuditReview;
      overallScore: number;
      passesGate: boolean;
      staticFindingsCount: number;
    };

/**
 * Runs the full audit: Slither static analysis first (ground truth), then
 * oscAr AI translates + scores. Static-analysis unavailability fails CLOSED
 * (blocks mainnet) rather than open — this is a security gate, not a
 * best-effort feature.
 */
export async function runAudit(
  solidityCode: string,
  contractName: string,
): Promise<AuditResult> {
  const slither = await analyzeContract(solidityCode, contractName);

  if (slither.status === "not_configured" || slither.status === "unreachable") {
    return { status: "unavailable" };
  }
  if (slither.status === "compile_error") {
    return { status: "compile_error", message: slither.message };
  }

  const findings: SlitherFinding[] = slither.findings;

  const review = await callOscarAI<AuditReview>({
    system: AUDIT_REVIEWER_SYSTEM,
    userMessage: auditReviewerUserMessage({
      contractName,
      solidityCode,
      staticFindings: findings,
    }),
    schema: AUDIT_REVIEW_SCHEMA,
    maxTokens: 8000,
    thinking: true,
  });

  const overallScore = Math.round(
    review.security_score * WEIGHTS.security +
      review.gas_score * WEIGHTS.gas +
      review.code_quality_score * WEIGHTS.quality,
  );

  return {
    status: "completed",
    review,
    overallScore,
    passesGate: overallScore >= MAINNET_GATE_SCORE,
    staticFindingsCount: findings.length,
  };
}
