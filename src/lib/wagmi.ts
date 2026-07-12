import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { MAINNET_CHAINS, TESTNET_CHAINS } from "@/lib/chains/chains";
import type { Chain } from "viem/chains";

// wagmi + RainbowKit config across all 10 oscAr launch chains + testnets.
// WalletConnect project id is public by design (NEXT_PUBLIC_).
const chains = [...MAINNET_CHAINS, ...TESTNET_CHAINS] as [Chain, ...Chain[]];

// Real Reown/WalletConnect project ids are 32 hex chars. Until one is set,
// any WalletConnect-based wallet would open a relay connection that the
// relay rejects — spamming "Subscribing to ... failed" console errors on
// every page that mounts the providers. So when the id doesn't look real,
// offer only injected (extension) wallets and never touch the relay; the
// full default wallet list (with mobile/QR via WalletConnect) comes back
// automatically once a real NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
const hasRealProjectId = /^[0-9a-f]{32}$/i.test(projectId);

export const wagmiConfig = getDefaultConfig({
  appName: "oscAr",
  // getDefaultConfig throws on an empty projectId, so always pass something.
  projectId: hasRealProjectId ? projectId : "oscar_placeholder_projectid",
  chains,
  ssr: true,
  ...(hasRealProjectId
    ? {}
    : { wallets: [{ groupName: "Installed", wallets: [injectedWallet] }] }),
});
