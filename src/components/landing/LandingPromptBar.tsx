"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

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

/**
 * The landing page's "try it now" prompt bar. Unauthenticated visitors are
 * routed through /login with the intended destination preserved via
 * ?redirect= — the login page itself skips straight through if a session
 * already exists, so this works identically for signed-in and signed-out
 * visitors without a client-side auth check here.
 */
export function LandingPromptBar({ isAuthed }: { isAuthed: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function goToFactory(text: string) {
    const trimmed = text.trim();
    const target = trimmed
      ? `/dashboard/token-factory?prompt=${encodeURIComponent(trimmed)}`
      : "/dashboard/token-factory";
    router.push(isAuthed ? target : `/login?redirect=${encodeURIComponent(target)}`);
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center gap-2 rounded-xl border border-neon bg-bg-card p-2 shadow-neon">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") goToFactory(prompt);
          }}
          placeholder="Create a memecoin called MoonDog, 1B supply, 2% buy tax, anti-bot..."
          className="flex-1 bg-transparent px-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          onClick={() => goToFactory(prompt)}
          className="flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow"
        >
          <Send size={15} />
          Generate
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => goToFactory(chip.prompt)}
            className="rounded-full border border-neon bg-white/5 px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
