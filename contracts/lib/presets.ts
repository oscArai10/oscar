// Token configuration presets for the oscAr Factory. These build the
// OscarERC20.TokenConfig struct passed to deployToken(). Amounts are in WHOLE
// tokens (the contract scales by 10**decimals). Shared by tests and the
// deploy/config tooling.

export interface TokenConfig {
  name: string;
  symbol: string;
  decimalsValue: number;
  initialSupply: bigint;
  owner: string; // ignored by the factory (forced to caller); required by the struct
  mintable: boolean;
  maxSupply: bigint;
  pausable: boolean;
  buyTaxBps: number;
  sellTaxBps: number;
  taxWallet: string;
  maxWallet: bigint;
  maxTx: bigint;
  antibotBlocks: number;
  tradingEnabledAtLaunch: boolean;
}

const ZERO = "0x0000000000000000000000000000000000000000";

/** Minimal fixed-supply token: no owner powers, no tax, tradeable immediately. */
export function utilityToken(p: {
  name: string;
  symbol: string;
  supply: bigint;
  owner?: string;
  decimals?: number;
  mintable?: boolean;
  maxSupply?: bigint;
  pausable?: boolean;
}): TokenConfig {
  return {
    name: p.name,
    symbol: p.symbol,
    decimalsValue: p.decimals ?? 18,
    initialSupply: p.supply,
    owner: p.owner ?? ZERO,
    mintable: p.mintable ?? false,
    maxSupply: p.maxSupply ?? 0n,
    pausable: p.pausable ?? false,
    buyTaxBps: 0,
    sellTaxBps: 0,
    taxWallet: ZERO,
    maxWallet: 0n,
    maxTx: 0n,
    antibotBlocks: 0,
    tradingEnabledAtLaunch: true,
  };
}

/**
 * Fair launch: fixed supply, no taxes, no owner powers, tradeable immediately.
 * Owner typically renounces ownership right after seeding liquidity.
 */
export function fairLaunch(p: {
  name: string;
  symbol: string;
  supply: bigint;
  owner?: string;
}): TokenConfig {
  return utilityToken({ ...p });
}

/**
 * Memecoin: disclosed buy/sell tax to a treasury, anti-whale limits, and an
 * anti-snipe trading gate the owner enables at launch.
 */
export function memecoin(p: {
  name: string;
  symbol: string;
  supply: bigint;
  owner?: string;
  taxWallet: string;
  buyTaxBps?: number;
  sellTaxBps?: number;
  maxWallet?: bigint; // whole tokens
  maxTx?: bigint;
  antibotBlocks?: number;
}): TokenConfig {
  return {
    name: p.name,
    symbol: p.symbol,
    decimalsValue: 18,
    initialSupply: p.supply,
    owner: p.owner ?? ZERO,
    mintable: false,
    maxSupply: 0n,
    pausable: false,
    buyTaxBps: p.buyTaxBps ?? 200, // 2%
    sellTaxBps: p.sellTaxBps ?? 200,
    taxWallet: p.taxWallet,
    maxWallet: p.maxWallet ?? p.supply / 50n, // 2%
    maxTx: p.maxTx ?? p.supply / 100n, // 1%
    antibotBlocks: p.antibotBlocks ?? 3,
    tradingEnabledAtLaunch: false, // owner enables trading at launch
  };
}
