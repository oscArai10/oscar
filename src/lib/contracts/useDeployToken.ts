"use client";

import { useMemo } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { OSCAR_TOKEN_FACTORY_ABI } from "./abi/OscarTokenFactory";
import { toTokenConfigArgs } from "./deployConfig";
import type { DeployConfig } from "@/lib/ai/schemas";

/** Reads the factory's current flat deploy fee (native coin, wei) for the given chain. */
export function useDeployFee(factoryAddress: `0x${string}` | null, chainId: number) {
  return useReadContract({
    address: factoryAddress ?? undefined,
    abi: OSCAR_TOKEN_FACTORY_ABI,
    functionName: "deployFee",
    chainId,
    query: { enabled: !!factoryAddress },
  });
}

export interface DeployParams {
  factoryAddress: `0x${string}`;
  chainId: number;
  config: DeployConfig;
  tokenName: string;
  tokenSymbol: string;
  ownerAddress: `0x${string}`;
  feeWei: bigint;
}

/**
 * Submits a deployToken() call to the oscAr Factory Contract and tracks the
 * transaction through to confirmation. The factory deploys the token AND
 * forwards the flat fee to the fee wallet atomically, in the same
 * transaction the user signs — never a separate custody step.
 */
export function useDeployToken() {
  const {
    writeContract,
    data: hash,
    isPending: isSigning,
    error: writeError,
    reset,
  } = useWriteContract();

  const receipt = useWaitForTransactionReceipt({ hash });

  function deploy(params: DeployParams) {
    const tokenConfig = toTokenConfigArgs(
      params.config,
      params.tokenName,
      params.tokenSymbol,
      params.ownerAddress,
    );
    writeContract({
      address: params.factoryAddress,
      abi: OSCAR_TOKEN_FACTORY_ABI,
      functionName: "deployToken",
      args: [tokenConfig],
      value: params.feeWei,
      chainId: params.chainId,
    });
  }

  // Pull the deployed token address out of the TokenDeployed event once the
  // receipt lands — the write call itself only returns a tx hash.
  const deployedTokenAddress = useMemo(() => {
    if (!receipt.data) return null;
    for (const log of receipt.data.logs) {
      try {
        const decoded = decodeEventLog({
          abi: OSCAR_TOKEN_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "TokenDeployed") {
          return (decoded.args as { token: `0x${string}` }).token;
        }
      } catch {
        // Not every log in the receipt is a TokenDeployed event; skip.
        continue;
      }
    }
    return null;
  }, [receipt.data]);

  return {
    deploy,
    reset,
    hash,
    isSigning,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    deployedTokenAddress,
    error: writeError ?? receipt.error,
  };
}
