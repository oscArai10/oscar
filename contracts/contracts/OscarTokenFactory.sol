// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OscarERC20} from "./OscarERC20.sol";

/**
 * @title OscarTokenFactory
 * @notice Deployed once per chain and owned by the oscAr business wallet. A
 *         user's deploy transaction calls {deployToken}: the factory deploys
 *         their token AND forwards the flat fee (in native coin) to the fee
 *         wallet in the SAME transaction, atomically. If the fee transfer
 *         fails the whole deploy reverts — no custody, no trust required.
 *
 *         The deployed token's owner is forced to the caller, so the factory
 *         never holds ownership or funds. Owner-only setters update the fee
 *         amount and fee wallet.
 */
contract OscarTokenFactory is Ownable2Step, ReentrancyGuard {
    /// @notice Flat fee per deploy, in native coin (wei).
    uint256 public deployFee;
    /// @notice Wallet the fee is forwarded to.
    address public feeWallet;

    event TokenDeployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol,
        uint256 feePaid
    );
    event DeployFeeUpdated(uint256 fee);
    event FeeWalletUpdated(address indexed wallet);

    error InsufficientFee();
    error FeeTransferFailed();
    error RefundFailed();
    error ZeroAddress();

    constructor(uint256 _deployFee, address _feeWallet, address _owner) Ownable(_owner) {
        if (_feeWallet == address(0) || _owner == address(0)) revert ZeroAddress();
        deployFee = _deployFee;
        feeWallet = _feeWallet;
    }

    /**
     * @notice Deploy a token and forward the fee atomically.
     * @param config Token configuration. Its `owner` field is ignored and
     *               forced to msg.sender.
     * @return token The deployed token address.
     */
    function deployToken(OscarERC20.TokenConfig calldata config)
        external
        payable
        nonReentrant
        returns (address token)
    {
        if (msg.value < deployFee) revert InsufficientFee();

        // Force ownership to the caller — the factory never owns the token.
        OscarERC20.TokenConfig memory cfg = config;
        cfg.owner = msg.sender;

        OscarERC20 deployed = new OscarERC20(cfg);
        token = address(deployed);

        // Forward the fee; revert the entire deploy if it fails.
        uint256 fee = deployFee;
        (bool sent, ) = feeWallet.call{value: fee}("");
        if (!sent) revert FeeTransferFailed();

        // Refund any overpayment to the caller.
        uint256 excess = msg.value - fee;
        if (excess > 0) {
            (bool refunded, ) = msg.sender.call{value: excess}("");
            if (!refunded) revert RefundFailed();
        }

        emit TokenDeployed(token, msg.sender, cfg.name, cfg.symbol, fee);
    }

    // --- Owner controls ---

    function setDeployFee(uint256 _fee) external onlyOwner {
        deployFee = _fee;
        emit DeployFeeUpdated(_fee);
    }

    function setFeeWallet(address _wallet) external onlyOwner {
        if (_wallet == address(0)) revert ZeroAddress();
        feeWallet = _wallet;
        emit FeeWalletUpdated(_wallet);
    }
}
