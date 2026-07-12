"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatEther } from "viem";
import {
  Rocket,
  Wallet,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getDeployableChains } from "@/lib/contracts/availableChains";
import { useDeployFee, useDeployToken } from "@/lib/contracts/useDeployToken";
import { validateDeployConfig } from "@/lib/contracts/deployConfig";
import type { DeployConfig } from "@/lib/ai/schemas";
import type { MainnetDeployLimitStatus } from "@/lib/billing/limits";

interface DeploySectionProps {
  contractName: string;
  tokenName: string;
  tokenSymbol: string;
  deployConfig: DeployConfig;
  canDeployMainnet: boolean;
  auditOverallScore: number | null;
  /** null when signed out / Supabase not configured — no limit applied. */
  mainnetLimitStatus: MainnetDeployLimitStatus | null;
}

export function DeploySection({
  contractName,
  tokenName,
  tokenSymbol,
  deployConfig,
  canDeployMainnet,
  auditOverallScore,
  mainnetLimitStatus,
}: DeploySectionProps) {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const allChains = useMemo(() => getDeployableChains(), []);
  const [selectedKey, setSelectedKey] = useState<string | null>(allChains[0]?.key ?? null);
  const selected = allChains.find((c) => c.key === selectedKey) ?? null;

  const configProblems = useMemo(() => validateDeployConfig(deployConfig), [deployConfig]);

  const { data: feeWei } = useDeployFee(
    selected?.factoryAddress ?? null,
    selected?.chainId ?? 0,
  );
  const { deploy, isSigning, isConfirming, isConfirmed, deployedTokenAddress, hash, error } =
    useDeployToken();
  // Guard so the deployment is only persisted once — a ref, not state, since
  // it's never rendered and flipping it shouldn't re-render anything.
  const persistedRef = useRef(false);

  const wrongNetwork = isConnected && !!selected && currentChainId !== selected.chainId;
  const blockedByGate = !!selected?.isMainnet && !canDeployMainnet;
  const blockedByLimit = !!selected?.isMainnet && mainnetLimitStatus?.reachedLimit === true;

  function handleDeploy() {
    if (!selected || !address || feeWei === undefined || blockedByGate || blockedByLimit) return;
    if (wrongNetwork) {
      switchChain?.({ chainId: selected.chainId });
      return;
    }
    deploy({
      factoryAddress: selected.factoryAddress,
      chainId: selected.chainId,
      config: deployConfig,
      tokenName,
      tokenSymbol,
      ownerAddress: address,
      feeWei,
    });
  }

  // Persist the confirmed deploy to the dashboard's deployments table —
  // best-effort; the on-chain deploy has already succeeded regardless.
  useEffect(() => {
    if (!isConfirmed || persistedRef.current || !deployedTokenAddress || !selected || !hash) return;
    persistedRef.current = true;
    fetch("/api/deployments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_name: contractName,
        token_name: tokenName,
        token_symbol: tokenSymbol,
        chain: selected.key,
        is_mainnet: selected.isMainnet,
        contract_address: deployedTokenAddress,
        tx_hash: hash,
        audit_score: auditOverallScore,
      }),
    }).catch(() => {
      /* best-effort */
    });
  }, [
    isConfirmed,
    deployedTokenAddress,
    selected,
    hash,
    contractName,
    tokenName,
    tokenSymbol,
    auditOverallScore,
  ]);

  if (allChains.length === 0) {
    return (
      <Card title="Deploy">
        <div className="flex items-start gap-3 rounded-xl border border-status-gold/30 bg-status-gold/5 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-status-gold" />
          <p className="text-sm text-text-secondary">
            No chains are live yet — the oscAr Factory Contract hasn&apos;t been
            deployed on any network. Check back soon.
          </p>
        </div>
      </Card>
    );
  }

  if (isConfirmed && deployedTokenAddress && selected) {
    const explorerUrl = selected.explorerBaseUrl
      ? `${selected.explorerBaseUrl}/token/${deployedTokenAddress}`
      : null;
    return (
      <Card title="Deploy">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={32} className="text-status-green" />
          <p className="font-heading text-base font-bold text-text-primary">
            {tokenName} is live on {selected.label}
          </p>
          <p className="font-mono text-xs text-text-muted">{deployedTokenAddress}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-neon bg-white/5 px-4 py-2 text-sm text-accent-cyan hover:border-accent-cyan"
              >
                <ExternalLink size={14} />
                View on Explorer
              </a>
            )}
            <a
              href={`/token/${selected.key}/${deployedTokenAddress}`}
              className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-white hover:bg-accent-blue-glow"
            >
              <Rocket size={14} />
              View Token Page
            </a>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Deploy">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Chain
          </label>
          <select
            value={selectedKey ?? ""}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="rounded-lg border border-neon bg-bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
          >
            {allChains.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}{" "}
                {c.isMainnet && !canDeployMainnet
                  ? "(locked — run audit ≥80)"
                  : c.isMainnet && mainnetLimitStatus?.reachedLimit
                    ? "(locked — free tier limit reached)"
                    : ""}
              </option>
            ))}
          </select>
        </div>

        {blockedByGate && (
          <div className="flex items-start gap-3 rounded-xl border border-status-red/30 bg-status-red/5 p-3">
            <Lock size={16} className="mt-0.5 shrink-0 text-status-red" />
            <p className="text-sm text-text-secondary">
              Mainnet is locked until this contract passes the security audit
              (score ≥ 80). Run the audit above, or pick a testnet instead.
            </p>
          </div>
        )}

        {!blockedByGate && blockedByLimit && (
          <div className="flex items-start gap-3 rounded-xl border border-status-gold/30 bg-status-gold/5 p-3">
            <Lock size={16} className="mt-0.5 shrink-0 text-status-gold" />
            <p className="text-sm text-text-secondary">
              You&apos;ve used {mainnetLimitStatus?.usedThisMonth}/{mainnetLimitStatus?.limit} free
              mainnet deploy{mainnetLimitStatus?.limit === 1 ? "" : "s"} this month.{" "}
              <Link href="/dashboard/settings" className="font-semibold text-accent-cyan hover:underline">
                Upgrade to Pro
              </Link>{" "}
              for unlimited mainnet deploys, or pick a testnet instead.
            </p>
          </div>
        )}

        {configProblems.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-status-red/30 bg-status-red/5 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-red" />
            <ul className="text-sm text-text-secondary">
              {configProblems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {selected && feeWei !== undefined && (
          <p className="text-sm text-text-secondary">
            Fee:{" "}
            <span className="font-mono text-text-primary">
              {formatEther(feeWei)} {selected.nativeCurrencySymbol}
            </span>{" "}
            + gas, paid from your wallet in the same transaction.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-status-red/30 bg-status-red/5 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-red" />
            <p className="text-sm text-text-secondary">{error.message}</p>
          </div>
        )}

        {!isConnected ? (
          <button
            onClick={() => openConnectModal?.()}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow"
          >
            <Wallet size={16} />
            Connect wallet to deploy
          </button>
        ) : (
          <button
            onClick={handleDeploy}
            disabled={
              !selected ||
              blockedByGate ||
              blockedByLimit ||
              configProblems.length > 0 ||
              feeWei === undefined ||
              isSigning ||
              isConfirming
            }
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-glow disabled:cursor-not-allowed disabled:opacity-40"
          >
            {(isSigning || isConfirming) && <Loader2 size={16} className="animate-spin" />}
            {wrongNetwork
              ? `Switch to ${selected?.label}`
              : isSigning
                ? "Confirm in wallet…"
                : isConfirming
                  ? "Deploying…"
                  : "Deploy"}
          </button>
        )}
      </div>
    </Card>
  );
}
