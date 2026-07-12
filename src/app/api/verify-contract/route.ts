import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { createPublicClient, http, encodeAbiParameters, parseEventLogs, type Chain } from "viem";
import { OSCAR_TOKEN_FACTORY_ABI } from "@/lib/contracts/abi/OscarTokenFactory";
import { OSCAR_ERC20_ABI } from "@/lib/contracts/abi/OscarERC20";
import { OSCAR_CHAINS } from "@/lib/chains/chains";
import { checkRateLimit } from "@/lib/ratelimit";

// Etherscan verification can take a few seconds to accept the submission.
export const maxDuration = 60;

// Must match contracts/hardhat.config.ts exactly, or Etherscan's bytecode
// match will fail. Re-check both if the Solidity version ever changes.
const SOLC_VERSION = "v0.8.24+commit.e11b9ed9";
const OPTIMIZER_RUNS = "200";
const EVM_VERSION = "paris";

/**
 * Submits the deployed token to the chain's block explorer for source
 * verification via Etherscan's V2 multichain API. Every oscAr token is the
 * same audited OscarERC20.sol deployed through the factory — only the
 * constructor arguments differ per deploy — so one pre-flattened source
 * file (src/lib/contracts/OscarERC20.flattened.sol) covers every
 * verification; only the constructor args need to be derived per-token.
 *
 * Those args are reconstructed from the chain itself rather than trusted
 * from the caller: the factory's own TokenDeployed receipt log proves the
 * tx really deployed this token and gives the true forced `owner`, and the
 * remaining TokenConfig fields are read from the token's public getters AT
 * THE DEPLOY BLOCK (historical state = exactly what the constructor set,
 * even if the owner has since called setters). Receipt logs instead of
 * decoding `tx.input` as deployToken() because EIP-7702/relayed
 * smart-account transactions point `tx.to` at a relay contract — decoding
 * their input fails, and `tx.from` is the relayer, not the token owner
 * (same pattern as src/lib/contracts/proveDeployment.ts).
 *
 * Fire-and-forget from POST /api/deployments — never blocks the deployment
 * record, and silently no-ops when Etherscan/Alchemy keys aren't configured
 * yet (they aren't, as of this build — see CLAUDE.md).
 */
export async function POST(req: NextRequest) {
  const etherscanKey = process.env.ETHERSCAN_API_KEY;
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!etherscanKey || !alchemyKey) {
    return NextResponse.json({
      status: "skipped",
      reason: "Etherscan or Alchemy key not configured yet.",
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const retryAfter = await checkRateLimit(ip, "verify-contract");
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: `Too many requests — try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: { chainId?: unknown; contractAddress?: unknown; txHash?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (
    typeof body.chainId !== "number" ||
    typeof body.contractAddress !== "string" ||
    typeof body.txHash !== "string"
  ) {
    return NextResponse.json({ error: "Missing chainId/contractAddress/txHash." }, { status: 400 });
  }

  const entry = Object.values(OSCAR_CHAINS).find(
    (c) => c.chain.id === body.chainId || c.testnet.id === body.chainId,
  );
  if (!entry) {
    return NextResponse.json({ error: "Unknown chain id." }, { status: 400 });
  }
  const isMainnetChain = entry.chain.id === body.chainId;
  const chain: Chain = isMainnetChain ? entry.chain : entry.testnet;
  const alchemySlug = isMainnetChain ? entry.alchemySlug : entry.alchemyTestnetSlug;

  try {
    const client = createPublicClient({
      chain,
      transport: http(`https://${alchemySlug}.g.alchemy.com/v2/${alchemyKey}`),
    });

    const receipt = await client.getTransactionReceipt({ hash: body.txHash as `0x${string}` });
    if (receipt.status !== "success") {
      return NextResponse.json({ error: "That transaction reverted." }, { status: 400 });
    }

    const factoryAddress = isMainnetChain ? entry.factoryAddress : entry.testnetFactoryAddress;
    if (!factoryAddress) {
      return NextResponse.json(
        { error: "No oscAr factory is deployed on that chain." },
        { status: 400 },
      );
    }
    const deployed = parseEventLogs({
      abi: OSCAR_TOKEN_FACTORY_ABI,
      eventName: "TokenDeployed",
      logs: receipt.logs,
    }).find(
      (e) =>
        e.address.toLowerCase() === factoryAddress.toLowerCase() &&
        e.args.token.toLowerCase() === (body.contractAddress as string).toLowerCase(),
    );
    if (!deployed) {
      return NextResponse.json(
        { error: "That transaction didn't deploy this token through the oscAr factory." },
        { status: 400 },
      );
    }

    // Rebuild the constructor's TokenConfig from the token's own state at
    // the deploy block. Field order must match the struct exactly.
    const tokenRead = {
      address: body.contractAddress as `0x${string}`,
      abi: OSCAR_ERC20_ABI,
      blockNumber: receipt.blockNumber,
    } as const;
    const [
      decimalsValue,
      initialSupply,
      mintable,
      maxSupply,
      pausable,
      buyTaxBps,
      sellTaxBps,
      taxWallet,
      maxWallet,
      maxTx,
      antibotBlocks,
      tradingEnabledAtLaunch,
    ] = await Promise.all([
      client.readContract({ ...tokenRead, functionName: "decimals" }),
      client.readContract({ ...tokenRead, functionName: "totalSupply" }),
      client.readContract({ ...tokenRead, functionName: "mintable" }),
      client.readContract({ ...tokenRead, functionName: "maxSupply" }),
      client.readContract({ ...tokenRead, functionName: "pausable" }),
      client.readContract({ ...tokenRead, functionName: "buyTaxBps" }),
      client.readContract({ ...tokenRead, functionName: "sellTaxBps" }),
      client.readContract({ ...tokenRead, functionName: "taxWallet" }),
      client.readContract({ ...tokenRead, functionName: "maxWallet" }),
      client.readContract({ ...tokenRead, functionName: "maxTx" }),
      client.readContract({ ...tokenRead, functionName: "antibotBlocks" }),
      client.readContract({ ...tokenRead, functionName: "tradingEnabled" }),
    ]);
    const finalCfg = {
      name: deployed.args.name,
      symbol: deployed.args.symbol,
      decimalsValue,
      initialSupply,
      owner: deployed.args.owner,
      mintable,
      maxSupply,
      pausable,
      buyTaxBps,
      sellTaxBps,
      taxWallet,
      maxWallet,
      maxTx,
      antibotBlocks,
      tradingEnabledAtLaunch,
    };

    const ctorAbiEntry = OSCAR_ERC20_ABI.find((x) => x.type === "constructor");
    if (!ctorAbiEntry || !("inputs" in ctorAbiEntry)) {
      throw new Error("OscarERC20 ABI has no constructor entry.");
    }
    const encodedArgs = encodeAbiParameters(
      ctorAbiEntry.inputs,
      [finalCfg] as unknown as Parameters<typeof encodeAbiParameters<typeof ctorAbiEntry.inputs>>[1],
    ).slice(2);

    const flattenedSource = await fs.readFile(
      path.join(process.cwd(), "src/lib/contracts/OscarERC20.flattened.sol"),
      "utf-8",
    );

    const params = new URLSearchParams({
      chainid: String(body.chainId),
      module: "contract",
      action: "verifysourcecode",
      apikey: etherscanKey,
      sourceCode: flattenedSource,
      codeformat: "solidity-single-file",
      contractaddress: body.contractAddress,
      contractname: "OscarERC20",
      compilerversion: SOLC_VERSION,
      optimizationUsed: "1",
      runs: OPTIMIZER_RUNS,
      evmversion: EVM_VERSION,
      constructorArguements: encodedArgs,
    });

    const res = await fetch("https://api.etherscan.io/v2/api", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await res.json();
    return NextResponse.json({
      status: data.status === "1" ? "submitted" : "failed",
      detail: data,
    });
  } catch (err) {
    console.error("[api/verify-contract]", err);
    return NextResponse.json({ status: "failed", error: "Verification submission failed." });
  }
}
