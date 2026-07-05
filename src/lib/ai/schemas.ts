// JSON schemas passed to oscAr AI for structured output, plus the matching
// TypeScript types. Schemas follow the structured-outputs subset:
// additionalProperties:false and required on every object.

export interface SafetyVerdict {
  verdict: "approve" | "reject";
  reason: string;
}

export const SAFETY_VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["approve", "reject"],
      description: "approve if the request is a legitimate token, reject otherwise",
    },
    reason: {
      type: "string",
      description:
        "Plain-language reason. For rejections, explain what was unacceptable without teaching how to evade the filter.",
    },
  },
  required: ["verdict", "reason"],
  additionalProperties: false,
} as const;

export interface GeneratedContract {
  contract_name: string;
  token_name: string;
  token_symbol: string;
  solidity_code: string;
  summary: string;
  features: { name: string; description: string }[];
  warnings: string[];
}

export const GENERATED_CONTRACT_SCHEMA = {
  type: "object",
  properties: {
    contract_name: {
      type: "string",
      description: "The Solidity contract name, PascalCase",
    },
    token_name: { type: "string", description: "Human-readable token name" },
    token_symbol: { type: "string", description: "Ticker symbol, uppercase" },
    solidity_code: {
      type: "string",
      description:
        "The complete, compilable Solidity source file, including SPDX line, pragma, imports, and comments",
    },
    summary: {
      type: "string",
      description:
        "Plain-language explanation of what this contract does, written for a non-programmer. 2-4 paragraphs.",
    },
    features: {
      type: "array",
      description: "Each tokenomics feature that was included",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short feature name" },
          description: {
            type: "string",
            description: "One-sentence plain-language description of what it does",
          },
        },
        required: ["name", "description"],
        additionalProperties: false,
      },
    },
    warnings: {
      type: "array",
      description:
        "Things the user should know before deploying (e.g. owner powers, tax implications). Empty if none.",
      items: { type: "string" },
    },
  },
  required: [
    "contract_name",
    "token_name",
    "token_symbol",
    "solidity_code",
    "summary",
    "features",
    "warnings",
  ],
  additionalProperties: false,
} as const;
