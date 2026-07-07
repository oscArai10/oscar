# oscAr — project rules for Claude

## AI brain/orb graphic — standing rule

The permanent AI brain/orb graphic for oscAr is `public/oscar-brain.png`.

- Whenever any part of the app needs an AI brain/orb visual (dashboard,
  loading screens, AI panels, empty states, anywhere), reuse this exact
  image asset. Render it via `NeuralBrainGraphic`
  (`src/components/dashboard/NeuralBrainGraphic.tsx`), or add a new
  wrapper for a different size/context if needed — but always point it
  at `public/oscar-brain.png`.
- Do NOT hand-draw a replacement in SVG or approximate it with CSS glow
  effects. Earlier attempts at that were explicitly rejected — the real
  image is the only acceptable version.
- Do NOT ask the user for the brain image again — it is already saved in
  the project.

## Project status — resume here

Last updated: 2026-07-07. Build order is being followed step by step; the
user approves each step before the next. Tech stack, scope, and design
system are per the v1 master prompt (Next.js 14 + TS + Tailwind, PWA, 10
EVM chains, non-custodial, Claude AI primary / GPT-4o failover, branded
"oscAr AI" publicly / "oscAr PULSE" as the app / "oscAr CORE" admin).

### Built so far (all committed on `master`)

1. **Scaffold** — Next.js 14 + TS + Tailwind, PWA (next-pwa: manifest,
   service worker, icons generated from the cube logo), locked color
   palette + fonts (Syne / JetBrains Mono / Exo 2) wired into Tailwind &
   CSS vars, security headers, `.env.example` with every service's keys.
   Logo at `public/oscar-logo.webp`; dashboard reference image at
   `design/reference-dashboard.webp`.
2. **Design system + dashboard shell** (`/dashboard`, branded oscAr
   PULSE) — reusable primitives in `src/components/ui` (Card, StatCard +
   Sparkline, ProgressRing, LiveLineChart, DataTable, StatusDot,
   ActivityFeed), layout (`Sidebar` with nav + Coming Soon 🔒 +
   System Health, `Topbar`), and dashboard cards (WelcomeBanner,
   PulseAssistantCard with brain graphic, GasPriceWidget). Matches the
   reference image; palette verified pixel-exact. **Now wired to real
   Supabase data — see step 8.** Gas prices are still placeholder
   (needs a separate Alchemy integration).
3. **Landing page** — still the temporary shell in `src/app/page.tsx`
   (logo + tagline + real-stats-only line). NOT yet the full landing
   page (prompt bar, chips, features, pricing, footer). **Build this
   properly in a later step.**
4. **Token Factory** (`/dashboard/token-factory`) — REAL AI generation,
   no mocks. Flow: prompt → safety filter → generator → result.
   - `src/lib/ai/provider.ts` — single `callOscarAI` entry point. Claude
     (`claude-opus-4-8`, Anthropic SDK, structured JSON output, adaptive
     thinking for generation, prompt caching on system prompt) primary;
     GPT-4o (`gpt-4o`, raw OpenAI REST) failover after 2 consecutive
     availability failures, Claude re-checked every 60s, auto switch-back.
     Billing/credit errors count as availability failures (fail over).
     Both down → `OscarAIUnavailableError` → graceful "oscAr AI is
     updating" 503. Provider names never reach the client.
   - `src/lib/ai/prompts.ts` — safety-filter + generator system prompts
     (OpenZeppelin v5 only, taxes capped 25%, all owner powers disclosed,
     honeypot/hidden-fee/rug/impersonation/illegal blocked).
   - `src/lib/ai/schemas.ts`, `pipeline.ts` — JSON schemas +
     filter-then-generate pipeline (filter ALWAYS first).
   - `src/app/api/generate/route.ts` — validation, per-IP Upstash rate
     limit (auto-skips when Upstash keys absent), no provider leakage.
   - `src/components/token-factory/TokenFactoryClient.tsx` — prompt box +
     chips, brain-graphic loading state, safety-rejection card, error
     card, result with Plain English / Solidity tabs + copy. Dashboard
     PULSE bar routes typed prompt here via `?prompt=`.
5. **Auth** (SIWE wallet + email/OTP on Supabase, RLS from day one) —
   built and live-tested. Full detail + open items in the "Auth (step 5)"
   section below.
6. **Contract layer** (`contracts/`, separate Hardhat project) — built &
   fully tested (20/20 passing). `OscarERC20.sol`: audited configurable
   OZ v5 ERC20 (tax capped 25%, max wallet/tx floored 0.1%, one-way
   anti-snipe trading gate, opt-in mint/pause, no honeypot paths).
   `OscarTokenFactory.sol`: per-chain, owner = business wallet;
   `deployToken()` deploys the token AND forwards the flat native-coin fee
   to the fee wallet atomically (reverts if fee transfer fails), refunds
   excess, forces token owner = caller, owner-only fee/wallet setters.
   `lib/presets.ts` (utility/fair-launch/memecoin configs),
   `scripts/deploy-factory.ts` (owner runs per chain), 9 standard-EVM
   chains + testnets via Alchemy, Etherscan V2 verify. zkSync deferred
   (needs zksolc). NOT yet deployed on-chain — owner runs the deploy
   scripts + funds gas, then records factory addresses in
   `src/lib/chains/chains.ts` (factoryAddress). 23/23 tests now (2 bugs
   found and fixed via the audit tool below — see step 7).
7. **Slither audit service + audit pass** — built and live-tested.
   `services/slither/` (separate FastAPI/Python microservice, Docker —
   Slither can't run in Vercel functions): `POST /analyze` compiles with
   pinned solc 0.8.24 + vendored OpenZeppelin v5, filters findings to only
   the user's own contract file (drops OZ library noise). Internal API
   key auth. `src/lib/audit/` calls it, then oscAr AI (new
   `AUDIT_REVIEWER_SYSTEM` prompt) translates findings to plain language
   and scores Security/Gas/Code Quality (0-100 each); overall score is a
   deterministic 50/25/25 weighted average computed in code (not trusted
   to the LLM), gate is ≥80. **Fails CLOSED** if the Slither service is
   unreachable/unconfigured — blocks mainnet rather than skipping the
   audit, since this is a security gate. Wired into the Token Factory UI
   as a real "Run Security Audit" action (score rings + findings list +
   gate banner).
   Running this for real against `OscarERC20.sol` caught two genuine bugs
   the 20 passing contract tests had missed: the advertised anti-bot
   window was never enforced in `_update`, and the 0.1% anti-lock floor
   applied to the owner setter but not to construction. Both fixed with
   new regression tests (23/23 passing) — see the contract layer entry
   above.
   Open item: **the Slither service itself isn't deployed anywhere yet.**
   Owner needs to deploy `services/slither/` to Railway or Fly.io (see
   its README) and paste `SLITHER_SERVICE_URL` /
   `SLITHER_SERVICE_API_KEY` into `.env.local`. Until then the audit
   button correctly shows "unavailable, mainnet blocked" (verified live
   in the browser).
8. **Dashboard wired to real Supabase data** — built and live-tested.
   `supabase/schema.sql` adds `deployments` and `audit_reports` tables
   (same select-own-or-owner + insert-own RLS pattern as `profiles`).
   `POST /api/audit` now persists a row per completed audit for the
   signed-in user (best-effort, never breaks the audit response).
   `src/lib/dashboard/data.ts` has the real queries (deploy counts, chains
   used, avg security score + trend, latest audit breakdown, hourly
   deployment-activity buckets, recent audit feed) — returns honest empty
   states rather than fabricated numbers. `src/lib/supabase/profile.ts`
   dedupes the profile fetch between layout and page via React `cache()`.
   Gas Price Widget is the one card still on placeholder data (needs
   Alchemy, a separate integration).
   Verified live: ran the migration against the real project (confirmed
   RLS actually blocks unauthenticated reads), signed in as a test user,
   generated + audited a real contract (100/100), confirmed the row
   landed in `audit_reports`, and confirmed the dashboard rendered it —
   Avg Security Score 100 (1 audit), real score-breakdown rings, and the
   activity feed entry with correct relative time. Deleted the test user
   and confirmed the audit row cascade-deleted with it.
9. **End-to-end deploy flow** — built; on-chain testing blocked on the
   owner (see below). Fixed a real architecture gap first: the audited
   `OscarTokenFactory` (step 6) only ever deploys the fixed `OscarERC20`
   template via a `TokenConfig` struct — never arbitrary AI bytecode, by
   design — but the generator only produced prose Solidity with nothing
   structured to call the factory with, and its prompt still offered
   blacklist/vesting that the template doesn't implement (a real
   "promises an undeployable feature" bug). Fixed both: `deploy_config`
   (structured, `TokenConfig`-shaped) added to `GENERATED_CONTRACT_SCHEMA`,
   and `GENERATOR_SYSTEM` rewritten to only offer what's actually
   deployable, now explicitly disclosing unsupported requests instead of
   silently promising them. Verified live: a real generation produced
   `deploy_config` exactly matching the request (3%/4% tax → 300/400 bps,
   2% max wallet computed correctly), with the AI correctly noting
   "reflections, blacklists, vesting... not available."
   New: `src/lib/contracts/` (ABIs extracted from Hardhat artifacts,
   `deployConfig.ts` for TokenConfig conversion + client-side pre-validation
   mirroring the contract's own revert conditions, `useDeployToken.ts`
   wagmi hooks, a pre-flattened `OscarERC20.flattened.sol` for reuse across
   every verification since it's always the same contract). `chains.ts`
   split `factoryAddress` into separate mainnet/testnet fields (different
   contracts on different networks). `DeploySection.tsx` in Token Factory:
   chain selector, fee display, wallet connect, mainnet lock banner tied to
   the audit's `passesGate`. `/api/deployments` persists confirmed deploys.
   `/api/verify-contract` submits to Etherscan V2, deriving constructor
   args from the real on-chain `deployToken()` transaction rather than
   trusting the client. `/token/[chain]/[address]` is the public token
   page (deliberately uses the service-role client for this one narrow
   public read — a contract's address/chain/audit score are already public
   on-chain).
   Verified everything checkable without a live chain: contract suite
   still 23/23, production build clean, Deploy UI correctly shows "no
   chains are live yet" (true today), and the token page renders real data
   end-to-end (95/100 score, correct chain/date/explorer link) via a
   manually-inserted deployment row, 404s correctly for an unknown address
   — both proven against the real Supabase project with cascade delete
   confirmed on cleanup.
   **Open items (hard blockers, not skippable):** (1) no factory is
   deployed on any chain yet — needs the owner to fund a deployer wallet
   and run `contracts/scripts/deploy-factory.ts` (the private key must
   never be pasted into this chat); (2) `ALCHEMY_API_KEY` and
   `ETHERSCAN_API_KEY` aren't set in `.env.local` yet. Until both, no real
   `deployToken()` call or Etherscan submission has ever actually run —
   only build/type-check and the parts provably testable via Supabase
   directly.

### Live API test — PASSED (2026-07-06)

The Token Factory is verified end-to-end against the real Anthropic API
(Anthropic account funded; Claude primary handled both calls, no failover
needed):
- **MoonDog generation** → HTTP 200, ~60s, a complete OpenZeppelin v5
  ERC20 (Ownable2Step, 2% buy-only tax hard-capped at 25%, anti-bot
  cooldown capped at 30s, every owner power disclosed in warnings).
  Rendered correctly in the UI: Plain English tab (summary + features +
  "Before you deploy" warnings) and Solidity Code tab + copy button.
- **Honeypot prompt** ("only I can sell…") → HTTP 422, rejected by the
  safety filter with a clear plain-language reason.

Still open: OpenAI fallback key is `insufficient_quota` (untested live —
fund it to exercise the GPT-4o failover path for real). Security: the
API keys were pasted into chat, so **rotate both** when convenient.

### Auth (step 5) — BUILT & live-tested (2026-07-06)

SIWE wallet + email/OTP login on Supabase, RLS from day one. Verified
against the real Supabase project: email password sign-in → dashboard,
profile auto-create trigger fired, Topbar showed the real user, sign-out
cleared the session, middleware re-gated /dashboard (307 → /login), and
FK cascade deleted the profile with the auth user.
- `supabase/schema.sql` — profiles table (mirrors auth.users), signup
  trigger, RLS. PULSE/CORE split is STRUCTURAL: role enum ('user'/'owner')
  + is_owner(); users read/update only their own row and can't self-
  escalate role/tier; owner reads all. Run once in the SQL editor (done).
- Clients: `src/lib/supabase/{client,server,admin}.ts` +
  `isSupabaseConfigured()` guard so the app renders before keys exist.
- SIWE: `/api/auth/nonce` (httpOnly nonce cookie) + `/api/auth/siwe`
  (verify sig → find/create wallet user via service role → mint one-time
  token → client `verifyOtp` for a cookie session). Wallet users map to
  `{address}@wallet.oscar`. NOTE: the wallet round-trip itself is UNTESTED
  (needs a browser wallet + a real WalletConnect projectId).
- Email: signUp / signInWithPassword / magic-link OTP via Supabase Auth;
  `/auth/callback` exchanges the PKCE code.
- wagmi + RainbowKit across all 10 chains (`src/lib/wagmi.ts`,
  `src/app/providers.tsx`); `src/middleware.ts` gates /dashboard; Topbar
  has a sign-out menu; `/login` is branded (wallet + email tabs).

Open items: (1) WalletConnect projectId in `.env.local` is currently the
Supabase project ref, NOT a real Reown id — wallet login won't connect
until a real 32-char id from cloud.reown.com is pasted. (2) In Supabase →
Auth → URL Configuration, add `http://localhost:3000/auth/callback` as a
redirect URL for email confirmation / magic links to land back in-app.
(3) Rotate the pasted keys when convenient.

10. **Memecoin Factory** (`/dashboard/memecoin-factory`) — built &
    live-tested. A guided, meme-flavored builder over the SAME real
    pipeline as the Token Factory (no separate AI path, no mocks). The
    shared generate→audit→deploy flow was extracted out of
    TokenFactoryClient into `src/components/token-factory/`
    `useContractPipeline.ts` (phase/audit state + /api/generate +
    /api/audit fetches) and `ContractPipelinePanel.tsx` (brain loading
    card, safety-rejection card, result tabs, audit section,
    DeploySection) — both factories render the identical downstream flow.
    `src/components/memecoin-factory/MemecoinFactoryClient.tsx` is the
    builder: name/symbol + "Surprise me" wordlist roller, supply chips
    (1M/100M/1B/1T/custom), three vibe presets mirroring
    `contracts/lib/presets.ts` (Fair Launch = no taxes/limits/powers;
    Community Treasury = 2/2 tax + anti-whale + anti-snipe gate; Degen
    Mode = 4/4 + tighter limits), sliders for buy/sell tax, max
    wallet/tx, anti-bot blocks, a launch-gate toggle, and a treasury
    address field (required + validated when tax > 0). It composes a
    deterministic plain-language prompt and calls the same
    `/api/generate`. Verified live in the browser as a temp Supabase
    user (deleted after, cascade confirmed): a real generation of
    "GigaCoin" matched every dial exactly (1B fixed supply, 2%/2% to
    the entered treasury, 2% max wallet correctly computed as 20M
    tokens, 1% max tx, 3-block anti-bot, gated launch, no mint/pause),
    and the Deploy section listed Base Sepolia with the real 0.0001 ETH
    fee read from the live factory contract. Token Factory re-verified
    working after the refactor; production build clean.

    Follow-up (2026-07-07, same day): the user then did a real live wallet
    deploy through the Memecoin Factory itself — MoonDog (MOON), 100M
    supply, Community Treasury vibe. Confirmed on-chain: tx succeeded,
    `buyTaxBps`/`sellTaxBps` both 200 (2%) matching the vibe preset exactly,
    `deployments` row landed in Supabase. Two total real deploys now on
    record (TestDog via Token Factory, MoonDog via Memecoin Factory) — both
    factories proven live end-to-end with real wallets.

11. **Full landing page** (`/`) — built & live-tested. Replaces the
    temporary logo+tagline shell. Server component (`src/app/page.tsx`)
    checks auth once and passes `isAuthed` down; new
    `src/components/landing/`: `LandingNav` (Log In / Open Dashboard),
    `LandingPromptBar` (client — the hero prompt bar + quick chips, same
    copy as the dashboard's PulseAssistantCard), `HowItWorks` (3-step),
    `FeatureGrid` (6 feature cards: AI generation, 10+ chains, audits,
    non-custodial, Memecoin Factory, dashboard), `LandingFooter`
    (Product/Account link columns, real internal links only — no
    fabricated social/legal links). Pricing section deliberately deferred
    (user's call — Free/Pro copy needs real Paddle/Lemon Squeezy pricing
    that doesn't exist yet; add it as its own step later).
    The prompt bar is fully functional end-to-end, not decorative: typing
    or picking a chip routes an unauthenticated visitor through
    `/login?redirect=%2Fdashboard%2Ftoken-factory%3Fprompt%3D...`, and an
    already-authenticated visitor straight to the prefilled Token Factory.
    This required threading a `redirectTo` through the whole login path —
    `LoginPage`/`LoginClient` now take a `redirect` search param instead of
    a hardcoded `/dashboard`, and `emailRedirectTo` for magic-link/signup
    confirmation now carries `?next=` through to `/auth/callback` (which
    already supported `next`). Verified live end-to-end as a temp Supabase
    user (deleted after): typed a prompt on the signed-out landing page →
    redirected to `/login?redirect=...` → signed in → landed on
    `/dashboard/token-factory` with the exact original prompt already in
    the textarea. Nav/footer correctly flip to "Open Dashboard"/"Dashboard"
    once signed in. Verified responsive at mobile width. Type-check and
    production build both clean.

### Next steps (build order not yet done)

**PAUSED HERE (2026-07-07) — full landing page (step 11) built &
live-tested. Next net-new feature: confirm with the user — remaining:
badges, Paddle/Lemon Squeezy Pro, oscAr CORE + SENTINEL, PWA
finalization, security hardening pass.**

Context from the deploy milestone earlier the same day:

The factory is live on **Base Sepolia** at
`0x5A446b3ca84C962B487335be6d25B4527B01Aa3B` (recorded in
`src/lib/chains/chains.ts` → `base.testnetFactoryAddress`). Deploy fee
was lowered on-chain to **0.0001 ETH** via `setDeployFee` (testnet
faucet-friendly; owner = deployer wallet `0x8404…3d31`, which is also
the fee wallet on this testnet). Etherscan verification was deliberately
skipped (user decision — `ETHERSCAN_API_KEY` left empty; the deploy
script and `/api/verify-contract` both no-op gracefully without it).

**Live end-to-end verification (2026-07-07), all confirmed:** the user
generated "TestDog" (TDOG, 1B supply) in the real UI, connected MetaMask,
and deployed through `DeploySection`. On-chain tx
`0xcb175797…b58157` succeeded; the factory's own `TokenDeployed` event
fired (token `0xa0E4b62C1fc036b65b4Fb69Dd69cb640Cb87A241`, owner = user
wallet, 0.0001 ETH fee collected); owner holds the full 1B supply
(non-custodial confirmed); the `deployments` row landed in Supabase; and
`/token/base-testnet/0xa0E4…` renders correctly. Notable: MetaMask used
an **EIP-7702 smart account** (type-4 tx via a relayer — tx `to` is a
relay contract, NOT the factory), which worked fine for deploying but
WILL break `/api/verify-contract`'s "decode tx.input as deployToken"
logic once Etherscan/Alchemy keys are set — fix by reading the factory's
`TokenDeployed` receipt log instead (a background task chip was spawned
for this — task_6f7a3511, running in a separate session as of this
writing; check its outcome before assuming it's still open).

**Security note:** the deployer private key for `0x8404…3d31` was pasted
into chat (2026-07-07) — the user explicitly accepted this for
testnet-only use. That wallet/key must NEVER be promoted to mainnet
deployer; generate a fresh wallet (offline) when mainnet deploys happen.

Open items before/alongside feature work:
- `ALCHEMY_API_KEY` + `ETHERSCAN_API_KEY` in the app's `.env.local` are
  still empty — `/api/verify-contract` returns `{status:"skipped"}` until
  both are set (and needs the EIP-7702 fix above to work for
  smart-account wallets).
- WalletConnect projectId is still the placeholder — extension wallets
  work (injected connector), mobile/QR wallets don't.

The live deploy is confirmed working, the Memecoin Factory is done (step
10), and the full landing page is done (step 11 above). Remaining
net-new feature work: badges, Paddle/Lemon Squeezy Pro, oscAr CORE +
SENTINEL, PWA finalization, security hardening pass. Confirm with the
user which to pick up first — don't assume.

Deferred / later:

- 2FA (authenticator app) + login history / device management (deferred
  slice of the auth step).
- Wire the Gas Price Widget to Alchemy (last placeholder on the
  dashboard).
- zkSync factory deploy (needs zksolc, deferred separately from the 9
  standard-EVM chains).

### Dev notes

- Run the dev server via the Preview tool using `.claude/launch.json`
  (name `oscar-dev`). It points at `dev-server.cmd`, a wrapper that fixes
  the Node PATH for the sandbox launcher — don't replace it with a bare
  `npm run dev` command, that fails to resolve `node` in this environment.
- Verify UI changes in the browser (Preview tools), not just by building.
