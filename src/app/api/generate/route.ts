import { NextRequest, NextResponse } from "next/server";
import { generateToken } from "@/lib/ai/pipeline";
import { OscarAIUnavailableError } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ratelimit";

// Contract generation involves a long AI call — allow up to 5 minutes.
export const maxDuration = 300;

const MAX_PROMPT_LENGTH = 2000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt =
    typeof body === "object" && body !== null && "prompt" in body
      ? (body as { prompt: unknown }).prompt
      : undefined;

  if (typeof prompt !== "string" || prompt.trim().length < 10) {
    return NextResponse.json(
      { error: "Describe your token in at least a short sentence." },
      { status: 400 },
    );
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt too long — keep it under ${MAX_PROMPT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const retryAfter = await checkRateLimit(ip);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  try {
    const result = await generateToken(prompt.trim());
    if (result.status === "rejected") {
      return NextResponse.json(
        { status: "rejected", reason: result.reason },
        { status: 422 },
      );
    }
    return NextResponse.json({ status: "generated", contract: result.contract });
  } catch (err) {
    if (err instanceof OscarAIUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    // Never leak provider details to the client.
    console.error("[api/generate]", err);
    return NextResponse.json(
      { error: "Something went wrong generating your contract. Please try again." },
      { status: 500 },
    );
  }
}
