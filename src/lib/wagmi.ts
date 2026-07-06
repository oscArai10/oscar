import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { MAINNET_CHAINS, TESTNET_CHAINS } from "@/lib/chains/chains";
import type { Chain } from "viem/chains";

// wagmi + RainbowKit config across all 10 oscAr launch chains + testnets.
// WalletConnect project id is public by design (NEXT_PUBLIC_).
const chains = [...MAINNET_CHAINS, ...TESTNET_CHAINS] as [Chain, ...Chain[]];

// getDefaultConfig throws on an empty projectId, so fall back to a non-empty
// placeholder when it's not set yet (pre-keys). WalletConnect only uses the
// real value at connect time — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID for
// wallet login to actually work.
export const wagmiConfig = getDefaultConfig({
  appName: "oscAr",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "oscar_placeholder_projectid",
  chains,
  ssr: true,
});
