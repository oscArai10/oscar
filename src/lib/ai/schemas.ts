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

export const AUDIT_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    security_score: {
      type: "integer",
      description:
        "0-100. Start at 100 and deduct for every static-analysis or AI-identified security issue: high severity -25 to -40, medium -10 to -20, low/informational -2 to -5. A genuine honeypot/rug pattern should score near 0.",
    },
    gas_score: {
      type: "integer",
      description:
        "0-100. Start at 100 and deduct for gas-inefficiency findings (unnecessary storage reads, missed immutable/constant opportunities, costly loops), scaled by severity.",
    },
    code_quality_score: {
      type: "integer",
      description:
        "0-100. Start at 100 and deduct for style/maintainability findings (naming, dead code, missing NatSpec, unindexed events), scaled by severity.",
    },
    summary: {
      type: "string",
      description:
        "2-3 sentence plain-language verdict a non-programmer can understand: is this contract safe to deploy, and why.",
    },
    findings: {
      type: "array",
      description:
        "One entry per static-analysis finding provided, translated to plain language, PLUS any additional security issue you notice in the code that static analysis didn't catch (mark those source: ai_review).",
      items: {
        type: "object",
        properties: {
          source: { type: "string", enum: ["static_analysis", "ai_review"] },
          severity: {
            type: "string",
            enum: ["high", "medium", "low", "informational"],
          },
          category: {
            type: "string",
            enum: ["security", "gas", "code_quality"],
          },
          title: { type: "string", description: "Short finding title" },
          plain_language: {
            type: "string",
            description: "1-2 sentences explaining the issue and its real-world impact, for a non-programmer",
          },
        },
        required: ["source", "severity", "category", "title", "plain_language"],
        additionalProperties: false,
      },
    },
  },
  required: ["security_score", "gas_score", "code_quality_score", "summary", "findings"],
  additionalProperties: false,
} as const;
