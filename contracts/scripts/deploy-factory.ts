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
  console.log(`\nRecord this address in the app's chain config (factoryAddress).`);
  console.log(`Verify on the explorer with:`);
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
