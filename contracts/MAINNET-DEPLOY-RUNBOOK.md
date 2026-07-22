# Mainnet Factory Deploy — Owner Runbook

Deploys `OscarTokenFactory` to the 9 standard-EVM mainnets. This is the
single remaining launch blocker. Total cost is gas only (~$50–150 across
all 9 chains, mostly Ethereum). zkSync is deferred (needs zksolc) and is
NOT part of this run.

Everything below runs from the `contracts/` directory.

---

## 0. Safety rules (read first)

- **Generate a FRESH deployer wallet, offline.** The testnet deployer
  `0x8404…3d31` is compromised-by-policy (its private key was pasted into
  chat) and must NEVER hold mainnet funds or own mainnet factories.
- **Never paste the new private key into any chat, message, or issue.**
  It goes in exactly one place: `contracts/.env` → `DEPLOYER_PRIVATE_KEY`.
  That file is gitignored — double-check with `git status` that it never
  shows as a change.
- This wallet permanently **owns all 9 factories** (it can change fees and
  the fee wallet later). Back up the key securely (hardware wallet or
  offline storage). Losing it means losing control of the factories.
- Fund it with gas money only — a few dollars per chain (see table).

## 1. One-time setup

### 1a. Generate the wallet (offline)

Any of: a hardware wallet's exported account, a fresh MetaMask account
created on a trusted machine, or:

```bash
# from contracts/ — generates locally, prints once, saves nothing
npx hardhat console
> const w = require("ethers").Wallet.createRandom()
> w.address
> w.privateKey   // copy straight into contracts/.env, then close terminal
```

### 1b. Decide the fee wallet

`FEE_WALLET_ADDRESS` in `contracts/.env` is where every user's deploy fee
is forwarded. It can be the deployer itself or (better) a separate
business/treasury wallet. It is changeable later per-chain via
`setFeeWallet()` (owner only), but set the real one now.

### 1c. Update `contracts/.env`

Already set and working — leave alone: `ALCHEMY_API_KEY`, all
`DEPLOY_FEE_*` values (per-chain fees are pre-tuned to roughly equal USD).

Change these two:

```
DEPLOYER_PRIVATE_KEY=<the NEW key — replaces the old testnet key>
FEE_WALLET_ADDRESS=<real fee-collection wallet>
```

Optional but recommended: set `ETHERSCAN_API_KEY` (one free V2 key from
etherscan.io covers all supported explorers) so each factory auto-verifies
right after deploy. Without it, verification is skipped gracefully.

### 1d. Fund the deployer

Send native gas coin to the new address on each chain. Suggested amounts
(generous — leftover stays yours):

| Chain     | Coin | Suggested funding |
|-----------|------|-------------------|
| Ethereum  | ETH  | 0.02 ETH (do this one LAST) |
| Base      | ETH  | 0.002 ETH |
| Arbitrum  | ETH  | 0.002 ETH |
| Optimism  | ETH  | 0.002 ETH |
| Linea     | ETH  | 0.002 ETH |
| Scroll    | ETH  | 0.002 ETH |
| BNB       | BNB  | 0.01 BNB |
| Polygon   | POL  | 5 POL |
| Avalanche | AVAX | 0.1 AVAX |

## 2. Deploy — one command per chain

Sanity-compile first:

```bash
npx hardhat compile
```

Then deploy. **Do Base first** (cheap, and its testnet factory is already
proven live), **Ethereum last** (most expensive — run it once the process
is verified smooth on the cheap chains):

```bash
npx hardhat run scripts/deploy-factory.ts --network base
npx hardhat run scripts/deploy-factory.ts --network arbitrum
npx hardhat run scripts/deploy-factory.ts --network optimism
npx hardhat run scripts/deploy-factory.ts --network linea
npx hardhat run scripts/deploy-factory.ts --network scroll
npx hardhat run scripts/deploy-factory.ts --network bnb
npx hardhat run scripts/deploy-factory.ts --network polygon
npx hardhat run scripts/deploy-factory.ts --network avalanche
npx hardhat run scripts/deploy-factory.ts --network ethereum
```

Each run prints:

- `✅ Factory deployed: 0x…`
- **the exact line to set in `src/lib/chains/chains.ts`** (which chain
  key, which field) — this mapping is the easy thing to get wrong, so
  trust the script's output
- a manual `npx hardhat verify …` command (only needed if auto-verify
  didn't run)

**Save the full output of every run.** If a chain fails (RPC hiccup,
underfunded gas), fix and re-run just that chain — each deploy is
independent.

## 3. Record the addresses in the app

Collect the 9 printed `chains.ts` lines and hand them to Claude (or edit
directly): each goes in `src/lib/chains/chains.ts` as the
`factoryAddress` field of its chain key. Per the git workflow this lands
as a PR to `main`, then deploys to production with `vercel --prod --yes`.

Until this step ships, the app still shows no mainnet chains — deploying
the contracts alone changes nothing user-visible.

## 4. Post-deploy verification

1. **Explorer check (per chain):** the factory address shows the deploy
   tx, and (if verified) readable source. Read `deployFee` and
   `feeWallet` on the explorer — they must match `contracts/.env`.
2. **App check:** after the chains.ts PR is live, the Token Factory
   deploy section lists the mainnet chains with correct fees (read live
   from each factory).
3. **One real end-to-end deploy:** on Base (cheapest), deploy one real
   token through the app UI with a normal wallet, paying the real fee.
   Confirm: token created, fee arrived in `FEE_WALLET_ADDRESS`, the
   `deployments` row landed, and the public token page renders. This also
   exercises the on-chain deployment proof (`proveDeployment.ts`) against
   a mainnet for the first time.
4. **Free-tier limit:** that deploy also makes the deploying account show
   "1/1 mainnet deploys used" on `/dashboard/settings` — the first live
   test of the mainnet limit banner.

## 5. Afterwards

- Take `DEPLOYER_PRIVATE_KEY` back offline: once all 9 factories are
  deployed and verified, you may blank the value in `contracts/.env` and
  keep the key only in secure storage. Re-enter it only when running
  owner-only actions (`setDeployFee`, `setFeeWallet`) later.
- Sweep leftover gas back out of the deployer if you like — the factories
  don't need it funded to operate.
- zkSync (chain 10) remains deferred until the zksolc toolchain step.
