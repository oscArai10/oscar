// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title OscarERC20
 * @notice The audited, configurable ERC20 template every oscAr token is
 *         deployed from. Built entirely on OpenZeppelin v5. Every owner power
 *         is explicit and disclosed; the contract is designed so none of them
 *         can create a honeypot:
 *
 *         - Trading can be gated OFF before launch (anti-snipe) but the
 *           `enableTrading` switch is ONE-WAY — trading can never be turned
 *           back off, so holders can never be trapped.
 *         - Buy/sell taxes are hard-capped at 25% (2500 bps) in the setter.
 *         - Max wallet / max tx limits are floored at 0.1% of supply so they
 *           can't be shrunk into a de-facto transfer block.
 *         - A DEX pair itself can never be limit-restricted as a recipient.
 *
 *         Holders can always burn their own tokens (ERC20Burnable). Mint and
 *         pause are opt-in flags set at construction and surfaced in warnings.
 */
contract OscarERC20 is ERC20, ERC20Burnable, ERC20Pausable, Ownable2Step {
    uint16 public constant MAX_TAX_BPS = 2500; // 25% hard cap
    uint32 public constant MAX_ANTIBOT_BLOCKS = 100;

    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimalsValue;
        uint256 initialSupply; // whole tokens (scaled by 10**decimals)
        address owner; // token owner (the user); factory overrides to caller
        bool mintable;
        uint256 maxSupply; // whole tokens; 0 = unlimited (only if mintable)
        bool pausable;
        uint16 buyTaxBps; // <= MAX_TAX_BPS
        uint16 sellTaxBps; // <= MAX_TAX_BPS
        address taxWallet;
        uint256 maxWallet; // whole tokens; 0 = disabled
        uint256 maxTx; // whole tokens; 0 = disabled
        uint32 antibotBlocks; // strict-limit window after launch; <= MAX_ANTIBOT_BLOCKS
        bool tradingEnabledAtLaunch; // true = tradeable immediately; false = owner enables
    }

    uint8 private immutable _decimals;

    bool public immutable mintable;
    bool public immutable pausable;
    uint256 public maxSupply; // scaled
    uint16 public buyTaxBps;
    uint16 public sellTaxBps;
    address public taxWallet;
    uint256 public maxWallet; // scaled; 0 = disabled
    uint256 public maxTx; // scaled; 0 = disabled
    uint32 public antibotBlocks;

    bool public tradingEnabled;
    uint256 public launchBlock;

    mapping(address => bool) public isAMMPair;
    mapping(address => bool) public isExcludedFromLimits;
    mapping(address => bool) public isExcludedFromTax;
    mapping(address => uint256) private _lastTxBlock;

    event TradingEnabled(uint256 launchBlock);
    event AMMPairSet(address indexed pair, bool isPair);
    event TaxesUpdated(uint16 buyTaxBps, uint16 sellTaxBps);
    event TaxWalletUpdated(address indexed wallet);
    event LimitsUpdated(uint256 maxWallet, uint256 maxTx);
    event ExcludedFromLimits(address indexed account, bool excluded);
    event ExcludedFromTax(address indexed account, bool excluded);

    error TaxTooHigh();
    error NotMintable();
    error MaxSupplyExceeded();
    error NotPausable();
    error ZeroAddress();
    error TradingNotEnabled();
    error MaxTxExceeded();
    error MaxWalletExceeded();
    error LimitTooLow();
    error AlreadyEnabled();
    error PairCannotBeLimited();
    error AntibotCooldown();

    constructor(TokenConfig memory cfg)
        ERC20(cfg.name, cfg.symbol)
        Ownable(cfg.owner)
    {
        if (cfg.owner == address(0)) revert ZeroAddress();
        if (cfg.buyTaxBps > MAX_TAX_BPS || cfg.sellTaxBps > MAX_TAX_BPS) revert TaxTooHigh();
        if ((cfg.buyTaxBps > 0 || cfg.sellTaxBps > 0) && cfg.taxWallet == address(0)) {
            revert ZeroAddress();
        }

        _decimals = cfg.decimalsValue;
        uint256 scale = 10 ** cfg.decimalsValue;

        mintable = cfg.mintable;
        pausable = cfg.pausable;
        maxSupply = cfg.mintable ? cfg.maxSupply * scale : 0;
        buyTaxBps = cfg.buyTaxBps;
        sellTaxBps = cfg.sellTaxBps;
        taxWallet = cfg.taxWallet;
        antibotBlocks = cfg.antibotBlocks > MAX_ANTIBOT_BLOCKS
            ? MAX_ANTIBOT_BLOCKS
            : cfg.antibotBlocks;

        // Same 0.1%-of-supply floor as setLimits() — enforced at construction
        // too, so a non-zero limit can't be configured as a de-facto transfer
        // lock from the very first block, not just when the owner changes it
        // later.
        uint256 initialMint = cfg.initialSupply * scale;
        uint256 floor = initialMint / 1000;
        uint256 mw = cfg.maxWallet * scale;
        uint256 mt = cfg.maxTx * scale;
        if (mw != 0 && mw < floor) revert LimitTooLow();
        if (mt != 0 && mt < floor) revert LimitTooLow();
        maxWallet = mw;
        maxTx = mt;

        // Owner, tax wallet, and the token itself bypass limits and tax so the
        // owner can seed liquidity before launch.
        isExcludedFromLimits[cfg.owner] = true;
        isExcludedFromLimits[address(this)] = true;
        isExcludedFromLimits[cfg.taxWallet] = true;
        isExcludedFromTax[cfg.owner] = true;
        isExcludedFromTax[address(this)] = true;
        isExcludedFromTax[cfg.taxWallet] = true;

        if (cfg.tradingEnabledAtLaunch) {
            tradingEnabled = true;
            launchBlock = block.number;
        }

        _mint(cfg.owner, cfg.initialSupply * scale);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // --- Owner controls (all disclosed in the token's audit report) ---

    /// @notice One-way switch: enables trading for everyone. Cannot be undone,
    ///         so it can never be used to trap holders.
    function enableTrading() external onlyOwner {
        if (tradingEnabled) revert AlreadyEnabled();
        tradingEnabled = true;
        launchBlock = block.number;
        emit TradingEnabled(block.number);
    }

    function setAMMPair(address pair, bool value) external onlyOwner {
        if (pair == address(0)) revert ZeroAddress();
        isAMMPair[pair] = value;
        emit AMMPairSet(pair, value);
    }

    /// @notice Owner may lower taxes freely; the setter re-enforces the 25% cap.
    function setTaxes(uint16 newBuyBps, uint16 newSellBps) external onlyOwner {
        if (newBuyBps > MAX_TAX_BPS || newSellBps > MAX_TAX_BPS) revert TaxTooHigh();
        buyTaxBps = newBuyBps;
        sellTaxBps = newSellBps;
        emit TaxesUpdated(newBuyBps, newSellBps);
    }

    function setTaxWallet(address wallet) external onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        taxWallet = wallet;
        emit TaxWalletUpdated(wallet);
    }

    /// @notice 0 disables a limit. A non-zero limit is floored at 0.1% of
    ///         supply so it can't become a de-facto transfer block.
    function setLimits(uint256 newMaxWallet, uint256 newMaxTx) external onlyOwner {
        uint256 scale = 10 ** _decimals;
        uint256 floor = totalSupply() / 1000; // 0.1%
        uint256 mw = newMaxWallet * scale;
        uint256 mt = newMaxTx * scale;
        if (mw != 0 && mw < floor) revert LimitTooLow();
        if (mt != 0 && mt < floor) revert LimitTooLow();
        maxWallet = mw;
        maxTx = mt;
        emit LimitsUpdated(mw, mt);
    }

    function excludeFromLimits(address account, bool excluded) external onlyOwner {
        // A pair must remain limit-exempt as a recipient; enforced in _update.
        isExcludedFromLimits[account] = excluded;
        emit ExcludedFromLimits(account, excluded);
    }

    function excludeFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
        emit ExcludedFromTax(account, excluded);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        if (!mintable) revert NotMintable();
        if (maxSupply != 0 && totalSupply() + amount > maxSupply) revert MaxSupplyExceeded();
        _mint(to, amount);
    }

    function pause() external onlyOwner {
        if (!pausable) revert NotPausable();
        _pause();
    }

    function unpause() external onlyOwner {
        if (!pausable) revert NotPausable();
        _unpause();
    }

    // --- Transfer hook: trading gate, limits, and tax ---

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        // Mint (from == 0) and burn (to == 0) bypass trading gate / limits / tax.
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }

        bool fromExcludedLimits = isExcludedFromLimits[from];
        bool toExcludedLimits = isExcludedFromLimits[to];

        // Pre-launch: only limit-excluded parties (owner seeding LP) may move.
        if (!tradingEnabled && !fromExcludedLimits && !toExcludedLimits) {
            revert TradingNotEnabled();
        }

        // Anti-bot: for `antibotBlocks` blocks after launch, each non-excluded
        // address may appear in at most one transfer per block. This blocks
        // same-block bot bundling (multi-buy/sandwich patterns) at launch
        // without restricting normal trading once the window passes.
        if (antibotBlocks != 0 && block.number <= launchBlock + antibotBlocks) {
            if (!fromExcludedLimits) {
                if (_lastTxBlock[from] == block.number) revert AntibotCooldown();
                _lastTxBlock[from] = block.number;
            }
            if (!toExcludedLimits) {
                if (_lastTxBlock[to] == block.number) revert AntibotCooldown();
                _lastTxBlock[to] = block.number;
            }
        }

        // Max tx on the transfer amount.
        if (maxTx != 0 && !fromExcludedLimits && !toExcludedLimits) {
            if (value > maxTx) revert MaxTxExceeded();
        }

        // Tax on DEX buys/sells only.
        uint256 tax = 0;
        if (!isExcludedFromTax[from] && !isExcludedFromTax[to]) {
            if (isAMMPair[from] && buyTaxBps > 0) {
                tax = (value * buyTaxBps) / 10000;
            } else if (isAMMPair[to] && sellTaxBps > 0) {
                tax = (value * sellTaxBps) / 10000;
            }
        }

        // Max wallet on the recipient (never restrict a DEX pair as recipient).
        if (maxWallet != 0 && !toExcludedLimits && !isAMMPair[to]) {
            if (balanceOf(to) + (value - tax) > maxWallet) revert MaxWalletExceeded();
        }

        if (tax > 0) {
            super._update(from, taxWallet, tax);
            value -= tax;
        }
        super._update(from, to, value);
    }
}
