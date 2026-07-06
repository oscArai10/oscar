import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { TokenConfig } from "../lib/presets";

const ZERO = "0x0000000000000000000000000000000000000000";
const wei = (n: string) => ethers.parseUnits(n, 18);

describe("OscarERC20", () => {
  async function deploy(overrides: Partial<TokenConfig>, ownerAddr: string) {
    const base: TokenConfig = {
      name: "Test Token",
      symbol: "TEST",
      decimalsValue: 18,
      initialSupply: 1_000_000n,
      owner: ownerAddr,
      mintable: false,
      maxSupply: 0n,
      pausable: false,
      buyTaxBps: 0,
      sellTaxBps: 0,
      taxWallet: ZERO,
      maxWallet: 0n,
      maxTx: 0n,
      antibotBlocks: 0,
      tradingEnabledAtLaunch: true,
      ...overrides,
    };
    const Token = await ethers.getContractFactory("OscarERC20");
    return Token.deploy(base);
  }

  async function fixture() {
    const [owner, alice, bob, treasury, pair] = await ethers.getSigners();
    return { owner, alice, bob, treasury, pair };
  }

  describe("deployment", () => {
    it("mints the full supply to the owner with correct metadata", async () => {
      const { owner } = await loadFixture(fixture);
      const token = await deploy({ name: "MoonDog", symbol: "MOON", initialSupply: 1_000_000n }, owner.address);
      expect(await token.name()).to.equal("MoonDog");
      expect(await token.symbol()).to.equal("MOON");
      expect(await token.decimals()).to.equal(18);
      expect(await token.totalSupply()).to.equal(wei("1000000"));
      expect(await token.balanceOf(owner.address)).to.equal(wei("1000000"));
      expect(await token.owner()).to.equal(owner.address);
    });

    it("honors custom decimals", async () => {
      const { owner } = await loadFixture(fixture);
      const token = await deploy({ decimalsValue: 6, initialSupply: 1000n }, owner.address);
      expect(await token.decimals()).to.equal(6);
      expect(await token.totalSupply()).to.equal(ethers.parseUnits("1000", 6));
    });

    it("rejects a tax above the 25% cap at construction", async () => {
      const { owner, treasury } = await loadFixture(fixture);
      await expect(
        deploy({ buyTaxBps: 2501, taxWallet: treasury.address }, owner.address),
      ).to.be.revertedWithCustomError(await ethers.getContractFactory("OscarERC20"), "TaxTooHigh");
    });
  });

  describe("tax", () => {
    it("taxes DEX buys and sells but not normal transfers", async () => {
      const { owner, alice, bob, treasury, pair } = await loadFixture(fixture);
      const token = await deploy(
        { buyTaxBps: 200, sellTaxBps: 500, taxWallet: treasury.address },
        owner.address,
      );
      // Seed the "pair" with tokens (owner is tax/limit-exempt).
      await token.connect(owner).transfer(pair.address, wei("100000"));
      await token.connect(owner).setAMMPair(pair.address, true);

      // Buy: pair -> alice, 2% tax to treasury.
      await token.connect(pair).transfer(alice.address, wei("1000"));
      expect(await token.balanceOf(alice.address)).to.equal(wei("980"));
      expect(await token.balanceOf(treasury.address)).to.equal(wei("20"));

      // Normal transfer alice -> bob: untaxed.
      await token.connect(alice).transfer(bob.address, wei("100"));
      expect(await token.balanceOf(bob.address)).to.equal(wei("100"));

      // Sell: bob -> pair, 5% tax.
      const before = await token.balanceOf(treasury.address);
      await token.connect(bob).transfer(pair.address, wei("100"));
      expect(await token.balanceOf(treasury.address)).to.equal(before + wei("5"));
    });

    it("caps tax changes at 25%", async () => {
      const { owner, treasury } = await loadFixture(fixture);
      const token = await deploy({ buyTaxBps: 100, taxWallet: treasury.address }, owner.address);
      await expect(token.connect(owner).setTaxes(3000, 0)).to.be.revertedWithCustomError(
        token,
        "TaxTooHigh",
      );
      await token.connect(owner).setTaxes(500, 500); // lowering/adjusting within cap is fine
      expect(await token.buyTaxBps()).to.equal(500);
    });
  });

  describe("limits", () => {
    it("enforces max tx and max wallet, but never limits a pair as recipient", async () => {
      const { owner, alice, treasury, pair } = await loadFixture(fixture);
      const token = await deploy(
        { maxTx: 10_000n, maxWallet: 20_000n }, // whole tokens
        owner.address,
      );
      // Mark the pair first so it's limit-exempt as a recipient, then seed it
      // (mirrors the real flow: register the pair before adding liquidity).
      await token.connect(owner).setAMMPair(pair.address, true);
      await token.connect(owner).transfer(pair.address, wei("500000"));

      // Over max tx reverts.
      await expect(token.connect(pair).transfer(alice.address, wei("10001"))).to.be.revertedWithCustomError(
        token,
        "MaxTxExceeded",
      );
      // At max tx ok.
      await token.connect(pair).transfer(alice.address, wei("10000"));
      // Second buy keeps alice under maxWallet (20k).
      await token.connect(pair).transfer(alice.address, wei("9000"));
      // Next buy would push over maxWallet.
      await expect(token.connect(pair).transfer(alice.address, wei("2000"))).to.be.revertedWithCustomError(
        token,
        "MaxWalletExceeded",
      );
      // The pair itself can receive unlimited (a sell into the pool).
      await token.connect(alice).transfer(pair.address, wei("100"));
    });

    it("floors non-zero limits at 0.1% of supply", async () => {
      const { owner } = await loadFixture(fixture);
      const token = await deploy({}, owner.address); // 1,000,000 supply -> floor 1,000
      await expect(token.connect(owner).setLimits(500n, 0n)).to.be.revertedWithCustomError(
        token,
        "LimitTooLow",
      );
      await token.connect(owner).setLimits(0n, 0n); // disabling is allowed
      expect(await token.maxWallet()).to.equal(0n);
    });
  });

  describe("trading gate (anti-snipe)", () => {
    it("blocks non-excluded transfers until trading is enabled, one-way", async () => {
      const { owner, alice, bob } = await loadFixture(fixture);
      const token = await deploy({ tradingEnabledAtLaunch: false }, owner.address);

      // Owner (limit-excluded) can seed before launch.
      await token.connect(owner).transfer(alice.address, wei("1000"));
      // Alice -> Bob blocked pre-launch.
      await expect(token.connect(alice).transfer(bob.address, wei("1"))).to.be.revertedWithCustomError(
        token,
        "TradingNotEnabled",
      );
      await token.connect(owner).enableTrading();
      await token.connect(alice).transfer(bob.address, wei("1"));
      expect(await token.balanceOf(bob.address)).to.equal(wei("1"));
      // Cannot be re-toggled — no way to trap holders.
      await expect(token.connect(owner).enableTrading()).to.be.revertedWithCustomError(
        token,
        "AlreadyEnabled",
      );
      expect(await token.tradingEnabled()).to.equal(true);
    });
  });

  describe("mint / pause / burn", () => {
    it("mints only when enabled, owner-only, respecting max supply", async () => {
      const { owner, alice } = await loadFixture(fixture);
      const token = await deploy(
        { mintable: true, maxSupply: 2_000_000n, initialSupply: 1_000_000n },
        owner.address,
      );
      await token.connect(owner).mint(alice.address, wei("500000"));
      expect(await token.totalSupply()).to.equal(wei("1500000"));
      // Over cap reverts.
      await expect(token.connect(owner).mint(alice.address, wei("600000"))).to.be.revertedWithCustomError(
        token,
        "MaxSupplyExceeded",
      );
      // Non-owner cannot mint.
      await expect(token.connect(alice).mint(alice.address, wei("1"))).to.be.revertedWithCustomError(
        token,
        "OwnableUnauthorizedAccount",
      );
    });

    it("rejects mint on a non-mintable token", async () => {
      const { owner, alice } = await loadFixture(fixture);
      const token = await deploy({ mintable: false }, owner.address);
      await expect(token.connect(owner).mint(alice.address, wei("1"))).to.be.revertedWithCustomError(
        token,
        "NotMintable",
      );
    });

    it("pauses only when enabled and blocks transfers while paused", async () => {
      const { owner, alice, bob } = await loadFixture(fixture);
      const token = await deploy({ pausable: true }, owner.address);
      await token.connect(owner).transfer(alice.address, wei("100"));
      await token.connect(owner).pause();
      await expect(token.connect(alice).transfer(bob.address, wei("1"))).to.be.revertedWithCustomError(
        token,
        "EnforcedPause",
      );
      await token.connect(owner).unpause();
      await token.connect(alice).transfer(bob.address, wei("1"));
      expect(await token.balanceOf(bob.address)).to.equal(wei("1"));
    });

    it("rejects pause on a non-pausable token", async () => {
      const { owner } = await loadFixture(fixture);
      const token = await deploy({ pausable: false }, owner.address);
      await expect(token.connect(owner).pause()).to.be.revertedWithCustomError(token, "NotPausable");
    });

    it("lets holders burn their own tokens", async () => {
      const { owner } = await loadFixture(fixture);
      const token = await deploy({}, owner.address);
      await token.connect(owner).burn(wei("1000"));
      expect(await token.totalSupply()).to.equal(wei("999000"));
    });
  });
});
