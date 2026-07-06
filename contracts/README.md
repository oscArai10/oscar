# oscAr contracts

OpenZeppelin v5 ERC20 template + the per-chain fee-forwarding factory.

## Contracts

- **`OscarERC20.sol`** — the audited, configurable token every oscAr deploy is
  minted from. Built entirely on OpenZeppelin v5 (ERC20, ERC20Burnable,
  ERC20Pausable, Ownable2Step). Features are set at construction via a
  `TokenConfig` struct: custom decimals, buy/sell tax (hard-capped at 25%),
  anti-whale max wallet/tx (floored at 0.1% of supply), a **one-way**
  anti-snipe trading gate, and opt-in mint/pause. Every owner power is
  explicit; none can create a honeypot (trading can't be turned back off,
  a DEX pair can't be limit-blocked, taxes can't exceed 25%).
- **`OscarTokenFactory.sol`** — deployed once per chain, owned by the oscAr
  business wallet. `deployToken(config)` is `payable`: it deploys the user's
  token AND forwards the flat fee to the fee wallet **in the same transaction,
  atomically**. If the fee transfer fails the whole deploy reverts. The token's
  owner is forced to the caller, so the factory never holds funds or ownership.
  Overpayment is refunded. Owner-only `setDeployFee` / `setFeeWallet`.

## Develop

```bash
cd contracts
npm install
npm run compile
npm test          # 20 tests: token behaviors + factory fee-forward
```

## Deploy the 10 factories (owner only)

1. `cp .env.example .env` and fill in `DEPLOYER_PRIVATE_KEY` (the business
   wallet), `ALCHEMY_API_KEY`, `ETHERSCAN_API_KEY`, `FEE_WALLET_ADDRESS`, and
   the per-chain `DEPLOY_FEE_*` values.
2. Deploy per chain (the deployer signs and funds gas — ~$50–150 total across
   all chains, mostly Ethereum):

   ```bash
   npx hardhat run scripts/deploy-factory.ts --network base
   npx hardhat run scripts/deploy-factory.ts --network arbitrum
   # …repeat for ethereum, bnb, polygon, optimism, avalanche, linea, scroll
   ```

   Practice on a testnet first: `--network baseSepolia`.
3. Record each deployed factory address in the app's chain config
   (`src/lib/chains/chains.ts` → `factoryAddress`).

> **zkSync Era** uses a different bytecode format and needs the
> `@matterlabs/hardhat-zksync` (zksolc) toolchain — it's deployed separately
> from the 9 standard-EVM chains, in a later step.

**The `DEPLOYER_PRIVATE_KEY` lives only here in `contracts/.env`** — never in
the web app, never on Vercel.
