import {
  mainnet,
  base,
  bsc,
  polygon,
  arbitrum,
  optimism,
  avalanche,
  zksync,
  linea,
  scroll,
  sepolia,
  baseSepolia,
  bscTestnet,
  polygonAmoy,
  arbitrumSepolia,
  optimismSepolia,
  avalancheFuji,
  zksyncSepoliaTestnet,
  lineaSepolia,
  scrollSepolia,
  type Chain,
} from "viem/chains";

export interface OscarChain {
  chain: Chain;
  testnet: Chain;
  /** Alchemy network slug used to build RPC URLs server-side */
  alchemySlug: string;
  alchemyTestnetSlug: string;
  /** Address of the oscAr Factory Contract on this chain (set after owner deploys) */
  factoryAddress: `0x${string}` | null;
}

/** The 10 launch chains. All EVM — one Solidity codebase. */
export const OSCAR_CHAINS: Record<string, OscarChain> = {
  ethereum: {
    chain: mainnet,
    testnet: sepolia,
    alchemySlug: "eth-mainnet",
    alchemyTestnetSlug: "eth-sepolia",
    factoryAddress: null,
  },
  base: {
    chain: base,
    testnet: baseSepolia,
    alchemySlug: "base-mainnet",
    alchemyTestnetSlug: "base-sepolia",
    factoryAddress: null,
  },
  bnb: {
    chain: bsc,
    testnet: bscTestnet,
    alchemySlug: "bnb-mainnet",
    alchemyTestnetSlug: "bnb-testnet",
    factoryAddress: null,
  },
  polygon: {
    chain: polygon,
    testnet: polygonAmoy,
    alchemySlug: "polygon-mainnet",
    alchemyTestnetSlug: "polygon-amoy",
    factoryAddress: null,
  },
  arbitrum: {
    chain: arbitrum,
    testnet: arbitrumSepolia,
    alchemySlug: "arb-mainnet",
    alchemyTestnetSlug: "arb-sepolia",
    factoryAddress: null,
  },
  optimism: {
    chain: optimism,
    testnet: optimismSepolia,
    alchemySlug: "opt-mainnet",
    alchemyTestnetSlug: "opt-sepolia",
    factoryAddress: null,
  },
  avalanche: {
    chain: avalanche,
    testnet: avalancheFuji,
    alchemySlug: "avax-mainnet",
    alchemyTestnetSlug: "avax-fuji",
    factoryAddress: null,
  },
  zksync: {
    chain: zksync,
    testnet: zksyncSepoliaTestnet,
    alchemySlug: "zksync-mainnet",
    alchemyTestnetSlug: "zksync-sepolia",
    factoryAddress: null,
  },
  linea: {
    chain: linea,
    testnet: lineaSepolia,
    alchemySlug: "linea-mainnet",
    alchemyTestnetSlug: "linea-sepolia",
    factoryAddress: null,
  },
  scroll: {
    chain: scroll,
    testnet: scrollSepolia,
    alchemySlug: "scroll-mainnet",
    alchemyTestnetSlug: "scroll-sepolia",
    factoryAddress: null,
  },
};

export const MAINNET_CHAINS = Object.values(OSCAR_CHAINS).map((c) => c.chain);
export const TESTNET_CHAINS = Object.values(OSCAR_CHAINS).map((c) => c.testnet);
