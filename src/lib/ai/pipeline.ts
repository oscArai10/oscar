import "server-only";
import { callOscarAI } from "./provider";
import {
  SAFETY_FILTER_SYSTEM,
  GENERATOR_SYSTEM,
  safetyFilterUserMessage,
  generatorUserMessage,
} from "./prompts";
import {
  SAFETY_VERDICT_SCHEMA,
  GENERATED_CONTRACT_SCHEMA,
  type SafetyVerdict,
  type GeneratedContract,
} from "./schemas";

export type GenerationResult =
  | { status: "rejected"; reason: string }
  | { status: "generated"; contract: GeneratedContract };

/**
 * The Token Factory generation pipeline (master prompt §4, steps 2-3):
 * safety filter first — ALWAYS — then contract generation.
 * Throws OscarAIUnavailableError if both AI providers are down.
 */
export async function generateToken(prompt: string): Promise<GenerationResult> {
  const verdict = await callOscarAI<SafetyVerdict>({
    system: SAFETY_FILTER_SYSTEM,
    userMessage: safetyFilterUserMessage(prompt),
    schema: SAFETY_VERDICT_SCHEMA,
    maxTokens: 1024,
  });

  if (verdict.verdict !== "approve") {
    return { status: "rejected", reason: verdict.reason };
  }

  const contract = await callOscarAI<GeneratedContract>({
    system: GENERATOR_SYSTEM,
    userMessage: generatorUserMessage(prompt),
    schema: GENERATED_CONTRACT_SCHEMA,
    maxTokens: 16000,
    thinking: true,
  });

  return { status: "generated", contract };
}
