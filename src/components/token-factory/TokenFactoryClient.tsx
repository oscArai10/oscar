"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ContractPipelinePanel } from "./ContractPipelinePanel";
import { useContractPipeline } from "./useContractPipeline";
import type { MainnetDeployLimitStatus } from "@/lib/billing/limits";

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

export function TokenFactoryClient({
  initialPrompt,
  mainnetLimitStatus,
}: {
  initialPrompt?: string;
  mainnetLimitStatus: MainnetDeployLimitStatus | null;
}) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const { phase, audit, generate, runAudit } = useContractPipeline();

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
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(prompt);
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
              onClick={() => generate(prompt)}
              disabled={prompt.trim().length < 10 || phase.kind === "loading"}
              className="flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={15} />
              Generate Contract
            </button>
          </div>
        </div>
      </Card>

      <ContractPipelinePanel
        phase={phase}
        audit={audit}
        onRunAudit={runAudit}
        mainnetLimitStatus={mainnetLimitStatus}
      />
    </div>
  );
}
