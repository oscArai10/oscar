import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { utilityToken, memecoin } from "../lib/presets";

const FEE = ethers.parseEther("0.01");

describe("OscarTokenFactory", () => {
  async function fixture() {
    const [deployer, feeWallet, user, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("OscarTokenFactory");
    const factory = await Factory.deploy(FEE, feeWallet.address, deployer.address);
    return { factory, deployer, feeWallet, user, other };
  }

  it("deploys a token, forwards the fee atomically, and sets the caller as owner", async () => {
    const { factory, feeWallet, user } = await loadFixture(fixture);
    const cfg = utilityToken({ name: "Owned By User", symbol: "OBU", supply: 1_000_000n });

    const feeBefore = await ethers.provider.getBalance(feeWallet.address);
    const tokenAddr = await factory.connect(user).deployToken.staticCall(cfg, { value: FEE });
    await expect(factory.connect(user).deployToken(cfg, { value: FEE }))
      .to.emit(factory, "TokenDeployed")
      .withArgs(tokenAddr, user.address, "Owned By User", "OBU", FEE);

    // Fee forwarded to the fee wallet.
    expect(await ethers.provider.getBalance(feeWallet.address)).to.equal(feeBefore + FEE);
    // Factory keeps nothing.
    expect(await ethers.provider.getBalance(await factory.getAddress())).to.equal(0n);

    // Token owner is the caller, not the factory.
    const token = await ethers.getContractAt("OscarERC20", tokenAddr);
    expect(await token.owner()).to.equal(user.address);
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseUnits("1000000", 18));
  });

  it("refunds overpayment to the caller", async () => {
    const { factory, feeWallet, user } = await loadFixture(fixture);
    const cfg = utilityToken({ name: "Refund", symbol: "RFD", supply: 1n });

    const feeBefore = await ethers.provider.getBalance(feeWallet.address);
    const userBefore = await ethers.provider.getBalance(user.address);

    const tx = await factory.connect(user).deployToken(cfg, { value: FEE * 3n });
    const receipt = await tx.wait();
    const gas = receipt!.gasUsed * receipt!.gasPrice;

    // Fee wallet got exactly the fee; user paid only fee + gas (excess refunded).
    expect(await ethers.provider.getBalance(feeWallet.address)).to.equal(feeBefore + FEE);
    const userAfter = await ethers.provider.getBalance(user.address);
    expect(userBefore - userAfter).to.equal(FEE + gas);
    expect(await ethers.provider.getBalance(await factory.getAddress())).to.equal(0n);
  });

  it("reverts when the fee is insufficient", async () => {
    const { factory, user } = await loadFixture(fixture);
    const cfg = utilityToken({ name: "Cheap", symbol: "CHP", supply: 1n });
    await expect(
      factory.connect(user).deployToken(cfg, { value: FEE - 1n }),
    ).to.be.revertedWithCustomError(factory, "InsufficientFee");
  });

  it("reverts the whole deploy if the fee transfer fails", async () => {
    const { deployer, user } = await loadFixture(fixture);
    // Fee wallet is a contract that rejects native coin.
    const Rejector = await ethers.getContractFactory("RejectEther");
    const rejector = await Rejector.deploy();
    const Factory = await ethers.getContractFactory("OscarTokenFactory");
    const factory = await Factory.deploy(FEE, await rejector.getAddress(), deployer.address);

    const cfg = utilityToken({ name: "NoDeploy", symbol: "NOD", supply: 1n });
    await expect(
      factory.connect(user).deployToken(cfg, { value: FEE }),
    ).to.be.revertedWithCustomError(factory, "FeeTransferFailed");
  });

  it("deploys a memecoin preset with taxes and limits configured", async () => {
    const { factory, feeWallet, user } = await loadFixture(fixture);
    const cfg = memecoin({
      name: "MoonDog",
      symbol: "MOON",
      supply: 1_000_000_000n,
      taxWallet: feeWallet.address,
      buyTaxBps: 200,
    });
    const tokenAddr = await factory.connect(user).deployToken.staticCall(cfg, { value: FEE });
    await factory.connect(user).deployToken(cfg, { value: FEE });
    const token = await ethers.getContractAt("OscarERC20", tokenAddr);
    expect(await token.buyTaxBps()).to.equal(200);
    expect(await token.tradingEnabled()).to.equal(false); // owner enables at launch
    expect(await token.owner()).to.equal(user.address);
  });

  describe("owner controls", () => {
    it("lets the owner update the fee and fee wallet", async () => {
      const { factory, deployer, other } = await loadFixture(fixture);
      await expect(factory.connect(deployer).setDeployFee(ethers.parseEther("0.02")))
        .to.emit(factory, "DeployFeeUpdated")
        .withArgs(ethers.parseEther("0.02"));
      expect(await factory.deployFee()).to.equal(ethers.parseEther("0.02"));

      await expect(factory.connect(deployer).setFeeWallet(other.address))
        .to.emit(factory, "FeeWalletUpdated")
        .withArgs(other.address);
    });

    it("rejects non-owner setters and zero fee wallet", async () => {
      const { factory, deployer, other } = await loadFixture(fixture);
      await expect(factory.connect(other).setDeployFee(1n)).to.be.revertedWithCustomError(
        factory,
        "OwnableUnauthorizedAccount",
      );
      await expect(
        factory.connect(deployer).setFeeWallet(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });
});
