// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test helper. Has no receive()/fallback, so it rejects native-coin
///      transfers — used to exercise the factory's fee-transfer-failed revert.
contract RejectEther {}
