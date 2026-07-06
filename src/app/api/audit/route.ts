import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/audit/pipeline";
import { OscarAIUnavailableError } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ratelimit";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AuditReview } from "@/lib/ai/schemas";

// Static analysis + AI review can take a while — allow up to 5 minutes.
export const maxDuration = 300;

const MAX_SOURCE_LENGTH = 50_000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as {
    solidity_code?: unknown;
    contract_name?: unknown;
    token_name?: unknown;
    token_symbol?: unknown;
  };
  if (typeof b.solidity_code !== "string" || b.solidity_code.trim().length < 10) {
    return NextResponse.json({ error: "Missing contract source code." }, { status: 400 });
  }
  if (typeof b.contract_name !== "string" || b.contract_name.trim().length === 0) {
    return NextResponse.json({ error: "Missing contract name." }, { status: 400 });
  }
  if (b.solidity_code.length > MAX_SOURCE_LENGTH) {
    return NextResponse.json(
      { error: `Contract too large — keep it under ${MAX_SOURCE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const retryAfter = await checkRateLimit(ip);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const result = await runAudit(b.solidity_code, b.contract_name.trim());

    if (result.status === "unavailable") {
      return NextResponse.json(
        {
          status: "unavailable",
          error:
            "The security audit service is temporarily unavailable. Mainnet deploy stays locked until an audit can run — please try again shortly.",
        },
        { status: 503 },
      );
    }
    if (result.status === "compile_error") {
      return NextResponse.json(
        { status: "compile_error", error: result.message },
        { status: 422 },
      );
    }

    await saveAuditReport({
      contractName: b.contract_name.trim(),
      tokenName: typeof b.token_name === "string" ? b.token_name : null,
      tokenSymbol: typeof b.token_symbol === "string" ? b.token_symbol : null,
      review: result.review,
      overallScore: result.overallScore,
      passesGate: result.passesGate,
    });

    return NextResponse.json({
      status: "completed",
      review: result.review,
      overallScore: result.overallScore,
      passesGate: result.passesGate,
      staticFindingsCount: result.staticFindingsCount,
    });
  } catch (err) {
    if (err instanceof OscarAIUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[api/audit]", err);
    return NextResponse.json(
      { error: "Something went wrong running the audit. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * Persists a completed audit for the signed-in user, so the dashboard has
 * real history to show. Best-effort: audits work for anonymous callers too
 * (nothing to save), and a save failure never breaks the audit response —
 * the audit itself already succeeded by this point.
 */
async function saveAuditReport(params: {
  contractName: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  review: AuditReview;
  overallScore: number;
  passesGate: boolean;
}) {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("audit_reports").insert({
      user_id: user.id,
      contract_name: params.contractName,
      token_name: params.tokenName,
      token_symbol: params.tokenSymbol,
      security_score: params.review.security_score,
      gas_score: params.review.gas_score,
      code_quality_score: params.review.code_quality_score,
      overall_score: params.overallScore,
      passes_gate: params.passesGate,
      findings: params.review.findings,
      summary: params.review.summary,
    });
    if (error) console.error("[api/audit] failed to save audit report", error);
  } catch (err) {
    console.error("[api/audit] failed to save audit report", err);
  }
}
