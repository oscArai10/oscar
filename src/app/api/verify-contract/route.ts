import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { createPublicClient, http, decodeFunctionData, encodeAbiParameters, type Chain } from "viem";
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
 * Those args are decoded from the actual on-chain deployToken() transaction
 * rather than trusted from the caller, so verification always matches what
 * was really deployed (the factory overrides `owner` to the caller, which
 * we mirror here using the transaction's `from` address).
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

    const tx = await client.getTransaction({ hash: body.txHash as `0x${string}` });

    const decoded = decodeFunctionData({ abi: OSCAR_TOKEN_FACTORY_ABI, data: tx.input });
    if (decoded.functionName !== "deployToken") {
      return NextResponse.json({ error: "That transaction wasn't a deployToken call." }, { status: 400 });
    }
    // The factory forces token ownership to msg.sender — mirror that so the
    // constructor args submitted match what was actually deployed on-chain.
    const cfg = decoded.args[0] as Record<string, unknown>;
    // Decoded straight off the real transaction, so this always has every
    // TokenConfig field at runtime — the broad cast above is just to sidestep
    // decodeFunctionData's overload-union typing across the whole factory ABI.
    const finalCfg = { ...cfg, owner: tx.from } as Record<string, unknown>;

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
