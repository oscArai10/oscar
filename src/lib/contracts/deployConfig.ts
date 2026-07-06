import type { DeployConfig } from "@/lib/ai/schemas";

// Mirrors the constants in contracts/contracts/OscarERC20.sol exactly.
const MAX_TAX_BPS = 2500;
const MAX_ANTIBOT_BLOCKS = 100;

/**
 * Client-side pre-check mirroring OscarERC20's constructor reverts, so an
 * obviously-invalid config surfaces as a clear message before the wallet
 * even opens, instead of a cryptic on-chain revert costing gas. Returns an
 * empty array when the config is valid to submit.
 */
export function validateDeployConfig(config: DeployConfig): string[] {
  const problems: string[] = [];

  let initialSupply: bigint;
  try {
    initialSupply = BigInt(config.initialSupply || "0");
  } catch {
    return ["Initial supply must be a whole number."];
  }
  if (initialSupply <= 0n) problems.push("Initial supply must be greater than zero.");

  if (config.decimals < 0 || config.decimals > 18) {
    problems.push("Decimals must be between 0 and 18.");
  }
  if (config.buyTaxBps > MAX_TAX_BPS) {
    problems.push(`Buy tax (${(config.buyTaxBps / 100).toFixed(2)}%) exceeds the 25% cap.`);
  }
  if (config.sellTaxBps > MAX_TAX_BPS) {
    problems.push(`Sell tax (${(config.sellTaxBps / 100).toFixed(2)}%) exceeds the 25% cap.`);
  }
  if (config.antibotBlocks > MAX_ANTIBOT_BLOCKS) {
    problems.push(`Anti-bot window (${config.antibotBlocks} blocks) exceeds the ${MAX_ANTIBOT_BLOCKS}-block cap.`);
  }

  const floor = initialSupply / 1000n;
  const maxWallet = BigInt(config.maxWallet || "0");
  if (maxWallet !== 0n && maxWallet < floor) {
    problems.push(`Max wallet must be at least 0.1% of supply (${floor.toString()} tokens) or 0 to disable.`);
  }
  const maxTx = BigInt(config.maxTx || "0");
  if (maxTx !== 0n && maxTx < floor) {
    problems.push(`Max transaction must be at least 0.1% of supply (${floor.toString()} tokens) or 0 to disable.`);
  }

  return problems;
}

/**
 * Converts a DeployConfig (whole-token strings from the AI) plus the
 * connecting wallet's address into the exact OscarERC20.TokenConfig shape
 * the factory contract expects. Field order/names match the Solidity struct
 * exactly (contracts/contracts/OscarERC20.sol) — viem maps named tuple
 * components by key. Token amounts are passed as whole-token integers;
 * OscarERC20's own constructor multiplies by 10**decimals internally.
 */
export function toTokenConfigArgs(
  config: DeployConfig,
  tokenName: string,
  tokenSymbol: string,
  ownerAddress: `0x${string}`,
) {
  return {
    name: tokenName,
    symbol: tokenSymbol,
    decimalsValue: config.decimals,
    initialSupply: BigInt(config.initialSupply || "0"),
    owner: ownerAddress,
    mintable: config.mintable,
    maxSupply: BigInt(config.maxSupply || "0"),
    pausable: config.pausable,
    buyTaxBps: config.buyTaxBps,
    sellTaxBps: config.sellTaxBps,
    // The deployer's own wallet collects any buy/sell tax by default — there
    // is no separate tax-wallet field in the deploy UI for v1.
    taxWallet: ownerAddress,
    maxWallet: BigInt(config.maxWallet || "0"),
    maxTx: BigInt(config.maxTx || "0"),
    antibotBlocks: config.antibotBlocks,
    tradingEnabledAtLaunch: config.tradingEnabledAtLaunch,
  } as const;
}
