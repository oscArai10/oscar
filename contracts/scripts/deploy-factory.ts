import { ethers, network, run } from "hardhat";

// Deploys the oscAr Factory Contract on the selected --network. The OWNER runs
// this once per chain, signing with DEPLOYER_PRIVATE_KEY and funding gas.
//
//   npx hardhat run scripts/deploy-factory.ts --network base
//
// Reads from contracts/.env:
//   FEE_WALLET_ADDRESS   — where per-deploy fees are forwarded
//   DEPLOY_FEE_<NETWORK> — flat fee for this chain (whole native coin), else
//   DEPLOY_FEE_DEFAULT
async function main() {
  const [deployer] = await ethers.getSigners();
  const feeWallet = process.env.FEE_WALLET_ADDRESS;
  if (!feeWallet || !ethers.isAddress(feeWallet)) {
    throw new Error("Set FEE_WALLET_ADDRESS in contracts/.env");
  }

  const net = network.name.toUpperCase();
  const feeStr =
    process.env[`DEPLOY_FEE_${net}`] ?? process.env.DEPLOY_FEE_DEFAULT ?? "0.01";
  const fee = ethers.parseEther(feeStr);

  console.log(`\nDeploying OscarTokenFactory to ${network.name}`);
  console.log(`  deployer:  ${deployer.address}`);
  console.log(`  feeWallet: ${feeWallet}`);
  console.log(`  fee:       ${feeStr} (native coin)\n`);

  const Factory = await ethers.getContractFactory("OscarTokenFactory");
  const factory = await Factory.deploy(fee, feeWallet, deployer.address);
  await factory.waitForDeployment();
  const address = await factory.getAddress();

  console.log(`✅ Factory deployed: ${address}`);

  // Print the exact edit for src/lib/chains/chains.ts — with 18 networks the
  // "which key, which field" mapping is the easy thing to get wrong when
  // deploying across all chains in one sitting.
  const CHAIN_CONFIG_TARGET: Record<string, { key: string; field: string }> = {
    ethereum: { key: "ethereum", field: "factoryAddress" },
    base: { key: "base", field: "factoryAddress" },
    bnb: { key: "bnb", field: "factoryAddress" },
    polygon: { key: "polygon", field: "factoryAddress" },
    arbitrum: { key: "arbitrum", field: "factoryAddress" },
    optimism: { key: "optimism", field: "factoryAddress" },
    avalanche: { key: "avalanche", field: "factoryAddress" },
    linea: { key: "linea", field: "factoryAddress" },
    scroll: { key: "scroll", field: "factoryAddress" },
    sepolia: { key: "ethereum", field: "testnetFactoryAddress" },
    baseSepolia: { key: "base", field: "testnetFactoryAddress" },
    bnbTestnet: { key: "bnb", field: "testnetFactoryAddress" },
    polygonAmoy: { key: "polygon", field: "testnetFactoryAddress" },
    arbitrumSepolia: { key: "arbitrum", field: "testnetFactoryAddress" },
    optimismSepolia: { key: "optimism", field: "testnetFactoryAddress" },
    avalancheFuji: { key: "avalanche", field: "testnetFactoryAddress" },
    lineaSepolia: { key: "linea", field: "testnetFactoryAddress" },
    scrollSepolia: { key: "scroll", field: "testnetFactoryAddress" },
  };
  const target = CHAIN_CONFIG_TARGET[network.name];
  if (target) {
    console.log(`\nIn src/lib/chains/chains.ts, set (inside "${target.key}"):`);
    console.log(`  ${target.field}: "${address}",`);
  } else {
    console.log(`\nRecord this address in the app's chain config (factoryAddress).`);
  }

  console.log(`\nVerify on the explorer with:`);
  console.log(
    `  npx hardhat verify --network ${network.name} ${address} ${fee} ${feeWallet} ${deployer.address}\n`,
  );

  // Best-effort auto-verify (skips on local networks).
  if (network.name !== "hardhat" && network.name !== "localhost" && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for confirmations before verifying…");
    await factory.deploymentTransaction()?.wait(5);
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [fee, feeWallet, deployer.address],
      });
      console.log("✅ Verified on explorer.");
    } catch (e) {
      console.log("Verification skipped/failed (verify manually):", (e as Error).message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
