import "server-only";
import {
  createPublicClient,
  http,
  parseEventLogs,
  TransactionReceiptNotFoundError,
} from "viem";
import { OSCAR_TOKEN_FACTORY_ABI } from "@/lib/contracts/abi/OscarTokenFactory";
import { OSCAR_CHAINS } from "@/lib/chains/chains";

export type DeploymentProof =
  | {
      ok: true;
      /** Token name/symbol as actually emitted on-chain — authoritative over
       *  whatever the client claimed. */
      tokenName: string;
      tokenSymbol: string;
      ownerAddress: `0x${string}`;
    }
  | { ok: false; status: number; reason: string };

/**
 * Proves a claimed deployment really happened by reading the factory's own
 * TokenDeployed event out of the transaction receipt — the same
 * receipt-log approach works for both direct wallet transactions and
 * EIP-7702/relayed smart-account transactions (where tx.to is a relay
 * contract, not the factory, but the factory's logs are still in the
 * receipt).
 *
 * This is a security gate (deployment rows feed achievement badges, CORE
 * admin stats, and the public token page), so it fails CLOSED: no Alchemy
 * key or an unreachable RPC blocks the row rather than trusting the client.
 */
export async function proveDeployment(params: {
  /** OSCAR_CHAINS key, optionally suffixed "-testnet" (DeployableChainOption). */
  chainKey: string;
  txHash: `0x${string}`;
  contractAddress: `0x${string}`;
}): Promise<DeploymentProof> {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return {
      ok: false,
      status: 503,
      reason: "Deployment verification isn't configured yet — the deployment couldn't be recorded.",
    };
  }

  const isTestnet = params.chainKey.endsWith("-testnet");
  const baseKey = params.chainKey.replace(/-testnet$/, "");
  const cfg = OSCAR_CHAINS[baseKey];
  if (!cfg) {
    return { ok: false, status: 400, reason: "Unknown chain." };
  }
  const factoryAddress = isTestnet ? cfg.testnetFactoryAddress : cfg.factoryAddress;
  if (!factoryAddress) {
    return { ok: false, status: 400, reason: "No oscAr factory is deployed on that chain." };
  }

  const chain = isTestnet ? cfg.testnet : cfg.chain;
  const slug = isTestnet ? cfg.alchemyTestnetSlug : cfg.alchemySlug;
  const client = createPublicClient({
    chain,
    transport: http(`https://${slug}.g.alchemy.com/v2/${alchemyKey}`, { timeout: 10_000 }),
  });

  // The client calls us right after its own confirmation, but the RPC node we
  // hit may lag a block or two behind the one the wallet used — retry briefly
  // before deciding the transaction doesn't exist.
  let receipt;
  for (let attempt = 0; ; attempt++) {
    try {
      receipt = await client.getTransactionReceipt({ hash: params.txHash });
      break;
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2_000));
        continue;
      }
      if (err instanceof TransactionReceiptNotFoundError) {
        return { ok: false, status: 400, reason: "That transaction wasn't found on chain." };
      }
      console.error("[proveDeployment] RPC error", err);
      return {
        ok: false,
        status: 502,
        reason: "Couldn't reach the chain to verify the deployment — the row wasn't recorded.",
      };
    }
  }

  if (receipt.status !== "success") {
    return { ok: false, status: 400, reason: "That transaction reverted." };
  }

  const deployedEvents = parseEventLogs({
    abi: OSCAR_TOKEN_FACTORY_ABI,
    eventName: "TokenDeployed",
    logs: receipt.logs,
  });
  const match = deployedEvents.find(
    (e) =>
      e.address.toLowerCase() === factoryAddress.toLowerCase() &&
      e.args.token.toLowerCase() === params.contractAddress.toLowerCase(),
  );
  if (!match) {
    return {
      ok: false,
      status: 400,
      reason: "That transaction didn't deploy this token through the oscAr factory.",
    };
  }

  return {
    ok: true,
    tokenName: match.args.name,
    tokenSymbol: match.args.symbol,
    ownerAddress: match.args.owner,
  };
}
