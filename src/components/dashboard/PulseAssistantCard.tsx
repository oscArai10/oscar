"use client";

import { Sparkles, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";

const QUICK_CHIPS = ["Memecoin", "Utility Token", "Tax Token", "Fair Launch"];

export function PulseAssistantCard() {
  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-cyan" />
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-accent-cyan-blue">
            oscAr PULSE Assistant
          </h2>
        </div>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          Describe the token you want to build. oscAr AI generates an
          audited, gas-optimized contract — you review the plain-language
          report before anything ever touches mainnet.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              className="rounded-full border border-neon bg-white/5 px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-neon bg-bg-card p-2">
        <input
          type="text"
          placeholder="Create a memecoin called MoonDog, 1B supply, 2% buy tax, anti-bot..."
          className="flex-1 bg-transparent px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          aria-label="Send prompt"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue text-white transition-colors hover:bg-accent-blue-glow"
        >
          <Send size={16} />
        </button>
      </div>
    </Card>
  );
}
