import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY ?? "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

// Alchemy RPC URL for a given network slug.
const rpc = (slug: string) => `https://${slug}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // --- 9 standard EVM mainnets (zkSync needs the zksolc plugin — see note) ---
    ethereum: { url: rpc("eth-mainnet"), chainId: 1, accounts },
    base: { url: rpc("base-mainnet"), chainId: 8453, accounts },
    bnb: { url: rpc("bnb-mainnet"), chainId: 56, accounts },
    polygon: { url: rpc("polygon-mainnet"), chainId: 137, accounts },
    arbitrum: { url: rpc("arb-mainnet"), chainId: 42161, accounts },
    optimism: { url: rpc("opt-mainnet"), chainId: 10, accounts },
    avalanche: { url: rpc("avax-mainnet"), chainId: 43114, accounts },
    linea: { url: rpc("linea-mainnet"), chainId: 59144, accounts },
    scroll: { url: rpc("scroll-mainnet"), chainId: 534352, accounts },

    // --- testnets (free practice deploys) ---
    sepolia: { url: rpc("eth-sepolia"), chainId: 11155111, accounts },
    baseSepolia: { url: rpc("base-sepolia"), chainId: 84532, accounts },
    bnbTestnet: { url: rpc("bnb-testnet"), chainId: 97, accounts },
    polygonAmoy: { url: rpc("polygon-amoy"), chainId: 80002, accounts },
    arbitrumSepolia: { url: rpc("arb-sepolia"), chainId: 421614, accounts },
    optimismSepolia: { url: rpc("opt-sepolia"), chainId: 11155420, accounts },
    avalancheFuji: { url: rpc("avax-fuji"), chainId: 43113, accounts },
    lineaSepolia: { url: rpc("linea-sepolia"), chainId: 59141, accounts },
    scrollSepolia: { url: rpc("scroll-sepolia"), chainId: 534351, accounts },

    // NOTE: zkSync Era (chainId 324 / testnet 300) uses a different bytecode
    // format and needs @matterlabs/hardhat-zksync (zksolc). It is deployed
    // separately from these 9 — added in the zkSync deploy step.
  },
  etherscan: {
    // Etherscan V2: one multichain API key verifies across supported explorers.
    apiKey: process.env.ETHERSCAN_API_KEY ?? "",
  },
};

export default config;
