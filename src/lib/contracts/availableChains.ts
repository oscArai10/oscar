import { OSCAR_CHAINS } from "@/lib/chains/chains";

export interface DeployableChainOption {
  /** Unique key for this option; testnets get a distinct key from their mainnet. */
  key: string;
  label: string;
  chainId: number;
  isMainnet: boolean;
  factoryAddress: `0x${string}`;
  nativeCurrencySymbol: string;
  explorerBaseUrl: string | undefined;
}

/**
 * Chains where the owner has actually deployed an oscAr Factory Contract —
 * i.e. chains a real deploy can target right now. Empty until the owner
 * runs contracts/scripts/deploy-factory.ts and records the resulting
 * address in src/lib/chains/chains.ts. The deploy UI must handle the empty
 * case gracefully rather than assuming at least one chain is always live.
 */
export function getDeployableChains(): DeployableChainOption[] {
  const options: DeployableChainOption[] = [];

  for (const [key, cfg] of Object.entries(OSCAR_CHAINS)) {
    if (cfg.testnetFactoryAddress) {
      options.push({
        key: `${key}-testnet`,
        label: `${cfg.testnet.name} (testnet)`,
        chainId: cfg.testnet.id,
        isMainnet: false,
        factoryAddress: cfg.testnetFactoryAddress,
        nativeCurrencySymbol: cfg.testnet.nativeCurrency.symbol,
        explorerBaseUrl: cfg.testnet.blockExplorers?.default.url,
      });
    }
    if (cfg.factoryAddress) {
      options.push({
        key,
        label: cfg.chain.name,
        chainId: cfg.chain.id,
        isMainnet: true,
        factoryAddress: cfg.factoryAddress,
        nativeCurrencySymbol: cfg.chain.nativeCurrency.symbol,
        explorerBaseUrl: cfg.chain.blockExplorers?.default.url,
      });
    }
  }

  return options;
}
