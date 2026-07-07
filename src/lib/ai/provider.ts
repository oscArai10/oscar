import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// oscAr AI provider — Claude API primary, GPT-4o silent failover.
//
// Failover policy (per master prompt §5):
// - 2 consecutive Claude availability failures → route requests to GPT-4o
// - while failed over, Claude is re-tried ("health check") once the recheck
//   interval elapses; a success switches back automatically
// - if BOTH providers fail, throw OscarAIUnavailableError — callers surface
//   "oscAr AI is updating — try again in a few minutes" and never crash.
//
// Publicly both providers are only ever called "oscAr AI". Provider names
// must never reach the client.
//
// Note: the failover state is per-serverless-instance. That's acceptable in
// v1 — each instance independently discovers an outage within 2 requests.
// ---------------------------------------------------------------------------

const CLAUDE_MODEL = "claude-opus-4-8";
const OPENAI_MODEL = "gpt-4o";
const FAILURE_THRESHOLD = 2;
const CLAUDE_RECHECK_MS = 60_000;

export interface AIHealthStatus {
  claudeConfigured: boolean;
  gpt4oConfigured: boolean;
  /** Currently routing generation calls to GPT-4o due to repeated Claude failures. */
  failedOver: boolean;
  consecutiveClaudeFailures: number;
}

/** Real in-memory failover state — no extra API call, just what oscAr AI
 *  actually observed on its last requests in this server instance. */
export function getAIHealthStatus(): AIHealthStatus {
  return {
    claudeConfigured: !!process.env.ANTHROPIC_API_KEY,
    gpt4oConfigured: !!process.env.OPENAI_API_KEY,
    failedOver: state.consecutiveClaudeFailures >= FAILURE_THRESHOLD,
    consecutiveClaudeFailures: state.consecutiveClaudeFailures,
  };
}

export class OscarAIUnavailableError extends Error {
  constructor() {
    super("oscAr AI is updating — try again in a few minutes.");
    this.name = "OscarAIUnavailableError";
  }
}

interface FailoverState {
  consecutiveClaudeFailures: number;
  failedOverAt: number | null;
}

const state: FailoverState = {
  consecutiveClaudeFailures: 0,
  failedOverAt: null,
};

export interface OscarAICall {
  system: string;
  userMessage: string;
  /** JSON schema the response must conform to */
  schema: Record<string, unknown>;
  maxTokens: number;
  /** Enable adaptive thinking for harder tasks (contract generation) */
  thinking?: boolean;
}

/** True when a Claude error is an availability problem worth failing over on
 *  (as opposed to a malformed request, which GPT-4o wouldn't fix). */
function isAvailabilityError(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.APIError) {
    const status = err.status;
    if (status === 401 || status === 429 || (status !== undefined && status >= 500)) {
      return true;
    }
    // Billing/credit exhaustion surfaces as a 400/403 but means Claude is
    // persistently unusable — exactly what the fallback exists for.
    const message = String((err as { message?: unknown }).message ?? "").toLowerCase();
    if (message.includes("credit balance") || message.includes("billing")) {
      return true;
    }
    return false;
  }
  return true; // timeouts / unknown transport errors
}

function shouldTryClaude(): boolean {
  if (state.consecutiveClaudeFailures < FAILURE_THRESHOLD) return true;
  // Failed over: retry Claude once the recheck interval has elapsed.
  return (
    state.failedOverAt !== null && Date.now() - state.failedOverAt >= CLAUDE_RECHECK_MS
  );
}

function recordClaudeFailure() {
  state.consecutiveClaudeFailures += 1;
  if (state.consecutiveClaudeFailures >= FAILURE_THRESHOLD) {
    state.failedOverAt = Date.now();
    console.warn(
      `[oscar-ai] primary provider failed ${state.consecutiveClaudeFailures}x — failing over`,
    );
  }
}

function recordClaudeSuccess() {
  if (state.consecutiveClaudeFailures >= FAILURE_THRESHOLD) {
    console.warn("[oscar-ai] primary provider recovered — switching back");
  }
  state.consecutiveClaudeFailures = 0;
  state.failedOverAt = null;
}

async function callClaude<T>(call: OscarAICall): Promise<T> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: call.maxTokens,
    system: [
      {
        type: "text",
        text: call.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    ...(call.thinking ? { thinking: { type: "adaptive" as const } } : {}),
    output_config: {
      format: { type: "json_schema", schema: call.schema },
    },
    messages: [{ role: "user", content: call.userMessage }],
  });

  if (response.stop_reason === "refusal") {
    // Treat a model-level refusal like a safety rejection upstream: the
    // caller gets a parse failure it can surface cleanly.
    throw new Error("oscAr AI declined this request.");
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("Empty response from oscAr AI.");
  }
  return JSON.parse(text.text) as T;
}

async function callGpt4o<T>(call: OscarAICall): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Fallback provider not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: call.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${call.system}\n\nRespond ONLY with a JSON object conforming exactly to this JSON schema:\n${JSON.stringify(call.schema)}`,
        },
        { role: "user", content: call.userMessage },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Fallback provider error ${res.status}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Empty response from fallback provider");
  }
  return JSON.parse(content) as T;
}

/**
 * Single entry point for every oscAr AI call. Handles provider selection,
 * failover, and recovery. Throws OscarAIUnavailableError when both brains
 * are down.
 */
export async function callOscarAI<T>(call: OscarAICall): Promise<T> {
  if (shouldTryClaude()) {
    try {
      const result = await callClaude<T>(call);
      recordClaudeSuccess();
      return result;
    } catch (err) {
      if (!isAvailabilityError(err)) throw err;
      recordClaudeFailure();
    }
  }

  try {
    return await callGpt4o<T>(call);
  } catch (fallbackErr) {
    console.error("[oscar-ai] both providers unavailable", fallbackErr);
    throw new OscarAIUnavailableError();
  }
}
