"use client";

import { useMemo, useState } from "react";
import { Rocket, Dices, Flame, Bird, Landmark, Wand2, Lock, Unlock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ContractPipelinePanel } from "@/components/token-factory/ContractPipelinePanel";
import { useContractPipeline } from "@/components/token-factory/useContractPipeline";
import { cn } from "@/lib/utils/cn";
import type { MainnetDeployLimitStatus } from "@/lib/billing/limits";

// Local wordlists for the "Surprise me" name roller — no AI call needed
// just to pick a silly name.
const NAME_PREFIXES = [
  "Moon", "Doge", "Pepe", "Giga", "Baby", "Turbo", "Wojak", "Chad",
  "Floki", "Shiba", "Rocket", "Diamond", "Laser", "Hyper", "Sigma", "Space",
];
const NAME_SUFFIXES = [
  "Dog", "Cat", "Frog", "Inu", "Rocket", "Whale", "Ape", "Hamster",
  "Goblin", "Lord", "King", "Punk", "Bonk", "Pup", "Moon", "Coin",
];

const SUPPLY_CHIPS: { label: string; value: string }[] = [
  { label: "1 Million", value: "1000000" },
  { label: "100 Million", value: "100000000" },
  { label: "1 Billion", value: "1000000000" },
  { label: "1 Trillion", value: "1000000000000" },
];

interface Vibe {
  key: string;
  label: string;
  icon: typeof Flame;
  description: string;
  buyTax: number;
  sellTax: number;
  maxWalletPct: number; // 0 = no limit
  maxTxPct: number; // 0 = no limit
  antibotBlocks: number;
  launchLocked: boolean;
}

const VIBES: Vibe[] = [
  {
    key: "fair",
    label: "Fair Launch",
    icon: Bird,
    description: "No taxes, no limits, no owner powers. Trading live the second it deploys.",
    buyTax: 0,
    sellTax: 0,
    maxWalletPct: 0,
    maxTxPct: 0,
    antibotBlocks: 0,
    launchLocked: false,
  },
  {
    key: "community",
    label: "Community Treasury",
    icon: Landmark,
    description: "2%/2% tax to a treasury, anti-whale limits, anti-snipe launch gate.",
    buyTax: 2,
    sellTax: 2,
    maxWalletPct: 2,
    maxTxPct: 1,
    antibotBlocks: 3,
    launchLocked: true,
  },
  {
    key: "degen",
    label: "Degen Mode",
    icon: Flame,
    description: "4%/4% tax, tight anti-whale limits, longer anti-bot window. Fully disclosed.",
    buyTax: 4,
    sellTax: 4,
    maxWalletPct: 1,
    maxTxPct: 0.5,
    antibotBlocks: 5,
    launchLocked: true,
  },
];

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function formatSupply(value: string): string {
  return BigInt(value).toLocaleString("en-US");
}

export function MemecoinFactoryClient({
  mainnetLimitStatus,
}: {
  mainnetLimitStatus: MainnetDeployLimitStatus | null;
}) {
  const { phase, audit, generate, runAudit } = useContractPipeline();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("1000000000");
  const [customSupply, setCustomSupply] = useState(false);
  const [vibeKey, setVibeKey] = useState("community");
  const [buyTax, setBuyTax] = useState(2);
  const [sellTax, setSellTax] = useState(2);
  const [maxWalletPct, setMaxWalletPct] = useState(2);
  const [maxTxPct, setMaxTxPct] = useState(1);
  const [antibotBlocks, setAntibotBlocks] = useState(3);
  const [launchLocked, setLaunchLocked] = useState(true);
  const [treasury, setTreasury] = useState("");

  const hasTax = buyTax > 0 || sellTax > 0;

  function rollName() {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    setName(prefix + suffix);
    setSymbol((prefix + suffix).toUpperCase().slice(0, 8));
  }

  function applyVibe(vibe: Vibe) {
    setVibeKey(vibe.key);
    setBuyTax(vibe.buyTax);
    setSellTax(vibe.sellTax);
    setMaxWalletPct(vibe.maxWalletPct);
    setMaxTxPct(vibe.maxTxPct);
    setAntibotBlocks(vibe.antibotBlocks);
    setLaunchLocked(vibe.launchLocked);
  }

  const problems = useMemo(() => {
    const list: string[] = [];
    if (name.trim().length < 2 || name.trim().length > 32) {
      list.push("Name needs 2–32 characters.");
    }
    if (!/^[A-Za-z][A-Za-z0-9]{1,7}$/.test(symbol.trim())) {
      list.push("Symbol needs 2–8 letters/numbers, starting with a letter.");
    }
    if (!/^\d+$/.test(supply) || BigInt(supply || "0") <= 0n) {
      list.push("Supply must be a positive whole number of tokens.");
    }
    if (hasTax && !ADDRESS_RE.test(treasury.trim())) {
      list.push("Taxes need a valid treasury wallet address (0x…, 40 hex characters).");
    }
    return list;
  }, [name, symbol, supply, hasTax, treasury]);

  // Deterministic plain-language prompt for the same real AI pipeline the
  // Token Factory uses — safety filter first, deploy_config out the other end.
  const builtPrompt = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      `Create a memecoin called ${name.trim()} with the symbol ${symbol.trim().toUpperCase()} and a fixed total supply of ${/^\d+$/.test(supply) && supply !== "" ? formatSupply(supply) : supply} tokens (18 decimals).`,
    );
    if (hasTax) {
      parts.push(
        `Apply a ${buyTax}% buy tax and ${sellTax}% sell tax, sent to the treasury wallet ${treasury.trim()}.`,
      );
    } else {
      parts.push("No buy or sell taxes at all.");
    }
    if (maxWalletPct > 0 || maxTxPct > 0) {
      const limits: string[] = [];
      if (maxWalletPct > 0) limits.push(`each wallet to ${maxWalletPct}% of supply`);
      if (maxTxPct > 0) limits.push(`each transaction to ${maxTxPct}% of supply`);
      parts.push(`Limit ${limits.join(" and ")}.`);
    } else {
      parts.push("No wallet or transaction limits.");
    }
    if (antibotBlocks > 0) {
      parts.push(
        `Enable anti-bot protection for the first ${antibotBlocks} blocks after launch.`,
      );
    }
    parts.push(
      launchLocked
        ? "Trading starts disabled and the owner enables it at launch (anti-snipe)."
        : "Trading is enabled immediately at deploy.",
    );
    parts.push("Not mintable and not pausable — the supply is fixed forever.");
    return parts.join(" ");
  }, [name, symbol, supply, hasTax, buyTax, sellTax, treasury, maxWalletPct, maxTxPct, antibotBlocks, launchLocked]);

  const canSummon = problems.length === 0 && phase.kind !== "loading";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h1 className="flex items-center gap-2 font-heading text-lg font-bold text-text-primary">
          <Rocket size={20} className="text-accent-cyan" />
          Memecoin Factory
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Point, click, meme. Pick a vibe, tweak the tokenomics, and oscAr AI
          writes the full contract on audited OpenZeppelin bases — every owner
          power disclosed, honeypots structurally impossible.
        </p>

        {/* Identity */}
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="block font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MoonDog"
              maxLength={32}
              className="mt-1.5 w-full rounded-lg border border-neon bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
              Symbol
            </label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="MOON"
              maxLength={8}
              className="mt-1.5 w-32 rounded-lg border border-neon bg-bg-card px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={rollName}
              type="button"
              className="flex items-center gap-2 rounded-lg border border-neon bg-white/5 px-3 py-2 text-sm text-text-secondary transition-colors hover:border-accent-cyan hover:text-accent-cyan"
            >
              <Dices size={15} />
              Surprise me
            </button>
          </div>
        </div>

        {/* Supply */}
        <div className="mt-5">
          <label className="block font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
            Total supply
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {SUPPLY_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  setSupply(chip.value);
                  setCustomSupply(false);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  !customSupply && supply === chip.value
                    ? "border-accent-cyan bg-accent-blue/20 text-accent-cyan"
                    : "border-neon bg-white/5 text-text-secondary hover:border-accent-cyan hover:text-accent-cyan",
                )}
              >
                {chip.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomSupply(true)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                customSupply
                  ? "border-accent-cyan bg-accent-blue/20 text-accent-cyan"
                  : "border-neon bg-white/5 text-text-secondary hover:border-accent-cyan hover:text-accent-cyan",
              )}
            >
              Custom
            </button>
            {customSupply && (
              <input
                value={supply}
                onChange={(e) => setSupply(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="69420000000"
                inputMode="numeric"
                className="w-48 rounded-lg border border-neon bg-bg-card px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Vibes */}
        <div className="mt-5">
          <label className="block font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
            Pick a vibe
          </label>
          <div className="mt-1.5 grid gap-3 sm:grid-cols-3">
            {VIBES.map((vibe) => (
              <button
                key={vibe.key}
                type="button"
                onClick={() => applyVibe(vibe)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  vibeKey === vibe.key
                    ? "border-accent-cyan bg-accent-blue/10"
                    : "border-neon bg-bg-card hover:border-accent-cyan/60",
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-2 font-heading text-sm font-bold",
                    vibeKey === vibe.key ? "text-accent-cyan" : "text-text-primary",
                  )}
                >
                  <vibe.icon size={15} />
                  {vibe.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-text-muted">
                  {vibe.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tokenomics dials */}
        <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <SliderRow
            label="Buy tax"
            value={buyTax}
            display={`${buyTax}%`}
            min={0}
            max={10}
            step={1}
            onChange={setBuyTax}
          />
          <SliderRow
            label="Sell tax"
            value={sellTax}
            display={`${sellTax}%`}
            min={0}
            max={10}
            step={1}
            onChange={setSellTax}
          />
          <SliderRow
            label="Max wallet"
            value={maxWalletPct}
            display={maxWalletPct === 0 ? "No limit" : `${maxWalletPct}% of supply`}
            min={0}
            max={5}
            step={0.5}
            onChange={setMaxWalletPct}
          />
          <SliderRow
            label="Max transaction"
            value={maxTxPct}
            display={maxTxPct === 0 ? "No limit" : `${maxTxPct}% of supply`}
            min={0}
            max={5}
            step={0.5}
            onChange={setMaxTxPct}
          />
          <SliderRow
            label="Anti-bot window"
            value={antibotBlocks}
            display={antibotBlocks === 0 ? "Off" : `${antibotBlocks} blocks`}
            min={0}
            max={10}
            step={1}
            onChange={setAntibotBlocks}
          />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Launch gate</p>
              <p className="text-xs text-text-muted">
                {launchLocked
                  ? "Trading locked until you enable it (anti-snipe)."
                  : "Trading live the moment it deploys."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLaunchLocked((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                launchLocked
                  ? "border-status-gold/40 bg-status-gold/10 text-status-gold"
                  : "border-status-green/40 bg-status-green/10 text-status-green",
              )}
            >
              {launchLocked ? <Lock size={13} /> : <Unlock size={13} />}
              {launchLocked ? "Locked at launch" : "Live at launch"}
            </button>
          </div>
        </div>

        {hasTax && (
          <div className="mt-4">
            <label className="block font-heading text-xs font-bold uppercase tracking-wide text-accent-cyan-blue">
              Treasury wallet (receives the taxes)
            </label>
            <input
              value={treasury}
              onChange={(e) => setTreasury(e.target.value.trim())}
              placeholder="0x… usually your own wallet"
              maxLength={42}
              className="mt-1.5 w-full max-w-md rounded-lg border border-neon bg-bg-card px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none"
            />
          </div>
        )}

        {/* Summon */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
          <p className="max-w-lg text-xs text-text-muted">
            {problems.length > 0
              ? problems[0]
              : "oscAr AI runs a safety check, then writes the full contract — you review the code and every disclosed power before deploying."}
          </p>
          <button
            onClick={() => generate(builtPrompt)}
            disabled={!canSummon}
            className="flex items-center gap-2 rounded-lg bg-accent-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Wand2 size={15} />
            Summon the Memecoin
          </button>
        </div>
      </Card>

      <ContractPipelinePanel
        phase={phase}
        audit={audit}
        onRunAudit={runAudit}
        loadingSubtext="Safety check first, then your memecoin is written on audited OpenZeppelin bases. Great memes take a minute or two."
        mainnetLimitStatus={mainnetLimitStatus}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="font-mono text-xs text-accent-cyan">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-accent-cyan"
      />
    </div>
  );
}
