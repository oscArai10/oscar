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

Last updated: 2026-07-10. Build order is being followed step by step; the
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
   Gas Price Widget was the one card still on placeholder data — now
   wired to real Alchemy data (see step 17 below).
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

Still open: OpenAI fallback key is `insufficient_quota` (429) — the
GPT-4o *success* path is still unverifiable until the key has real
quota. But the failover **mechanism** was verified live (2026-07-08):
temporarily invalidated `ANTHROPIC_API_KEY` (backed up + restored
byte-for-byte via `.env.local.bak`, real key never printed), fired one
real `/api/generate` → HTTP 503 with the graceful "oscAr AI is updating"
message, and the server log confirmed the exact path — the final error
was `Fallback provider error 429` thrown from `callGpt4o` (provider.ts
line ~160), proving Claude-failure was detected, GPT-4o was actually
reached as the fallback, and both-down degraded gracefully. The only
unproven segment is GPT-4o returning a valid contract (needs quota).
Security: the API keys were pasted into chat, so **rotate both** when
convenient.

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

12. **Achievement badges** — built & live-tested. User picked "user
    achievement badges" (gamification on the dashboard) over the other
    option offered (embeddable public audit-score badges) — that other
    idea is NOT built, may be worth revisiting later as a separate
    feature. `src/lib/dashboard/badges.ts` (`getBadges()`) derives 7
    badges purely from real `deployments`/`audit_reports` data — exact
    Supabase counts (not the dashboard's capped 50-row list, so users
    past that cap still earn correctly): First Deploy, Security
    Conscious (ran ≥1 audit), Mainnet Pioneer (≥1 mainnet deploy), 5
    Tokens Launched, Multi-Chain Deployer (≥3 distinct chains), Perfect
    Audit Score (any audit = 100/100), 10 Tokens Launched. No fabricated
    stats — every badge is a real threshold on real rows.
    `src/components/dashboard/BadgesCard.tsx` renders them as a grid on
    the main `/dashboard` page (earned = cyan + lit icon; locked = dimmed
    + lock overlay), title shows "Achievements (n/7)".
    Verified live as a temp Supabase user (deleted after, cascade
    confirmed): seeded 3 real deployments (1 mainnet, 3 distinct chains)
    + 1 audit at 100/100 → dashboard correctly showed "Achievements
    (5/7)" with exactly the right 5 earned (not 5/10 tokens) and the
    right 2 still locked.
    Incident during this verification: running `npm run build` while the
    `oscar-dev` preview server was still running corrupted its `.next`
    dev cache (missing webpack chunks, login page became unresponsive to
    clicks) — fixed by stopping the preview server, `rm -rf .next`, and
    restarting. **Going forward: never run `npm run build` while the
    dev preview server is active; stop it first, build, then restart.**

13. **oscAr CORE + SENTINEL** — built & live-tested. User picked "ops
    overview" for CORE (platform totals + user list + activity feed, NOT
    the "user management with promote/demote" variant) and "system
    health monitoring" for SENTINEL (NOT abuse/safety monitoring — that
    idea is not built, could be a separate later feature).
    New top-level surface at `/core` (separate from `/dashboard`, per the
    "PULSE/CORE split is STRUCTURAL" design from the auth step) —
    `src/middleware.ts` now also gates `/core/:path*`: no session → 
    `/login`; session but `role !== 'owner'` (checked via a live query
    against `profiles`) → redirected to `/dashboard`. This is
    defense-in-depth on top of the real enforcement, which is RLS itself
    — `src/lib/core/data.ts` uses the owner's own authenticated Supabase
    session (NOT the service-role client); every table's
    `*_select_own_or_owner` policy is what actually lets an owner read
    every user's rows, so even a middleware bypass couldn't leak data to
    a non-owner query.
    `src/app/core/` — `layout.tsx` + `CoreSidebar` (purple-branded,
    distinct from PULSE's cyan) with Overview / Users / SENTINEL nav:
    - `/core` (Overview): total users, total deployments, mainnet
      deployments, distinct chains, avg audit score — all exact counts
      across every user — plus a merged, time-sorted activity feed of
      recent deployments+audits platform-wide.
    - `/core/users`: every signed-up user (email, tier, role, deployment
      count, last-active derived from their most recent deployment).
    - `/core/sentinel`: live health checks, not a static "operational"
      banner — `getAIHealthStatus()` (new export in
      `src/lib/ai/provider.ts`) reports real in-memory failover state
      (no extra API call); `checkSlitherHealth()` (new export in
      `src/lib/audit/slitherClient.ts`) pings the service's real
      unauth'd `/health` route; Supabase is checked with a live query;
      Alchemy is checked with a live `eth_blockNumber` RPC call. Every
      status is either "healthy", "degraded", "unreachable", or
      "not_configured" — never a fabricated "all good".
    Verified live end-to-end with two temp Supabase users (both deleted
    after, cascades confirmed): a regular user hitting `/core` was
    correctly redirected to `/dashboard`; after promoting a second user
    to `role='owner'` (via service-role update — self-escalation is
    blocked by RLS, confirming the schema's design note), that user
    reached `/core` and saw the REAL correct platform totals spanning
    all 3 real users at the time (3 users, 3 deployments, 2 chains, 1
    audit at 87) with a correctly time-sorted cross-user activity feed —
    proving the RLS-based owner read actually works, not just gated by
    middleware. SENTINEL matched known real state exactly: Claude/GPT-4o/
    Supabase healthy, Slither and Alchemy both "not_configured" (matching
    the still-empty env vars noted earlier in this file).
    Type-check and production build both clean (after another `rm -rf
    .next` — the dev-cache-corruption lesson from step 12 held).

14. **Paddle billing (Pro tier)** — built & live-tested against sandbox
    plumbing; NOT yet connected to a real Paddle account (none exists —
    user confirmed "no, not yet"). Pricing is a "reasonable default to
    unblock the plumbing," NOT a final business decision — user picked
    this over supplying real numbers: Free = 1 mainnet deploy/month
    (unlimited testnet, generation, and audits); Pro = $19/mo unlimited
    mainnet + priority AI/audit (the "priority" claims are aspirational
    copy only — nothing actually queues/deprioritizes Free users today).
    Single source of truth: `src/lib/billing/plans.ts` — change the
    numbers there, nowhere else.
    `supabase/schema.sql`: added `paddle_customer_id`,
    `paddle_subscription_id`, `subscription_status` to `profiles` (with
    `alter table ... add column if not exists` migration statements since
    the live table already existed) — protected by the same
    self-escalation-proof RLS pattern as `tier`/`role` (users can't write
    these columns even via their own authenticated session; only the
    webhook, via the service-role client, can).
    **Owner action required before this schema change takes effect on
    the live project:** re-run the updated `supabase/schema.sql` in the
    Supabase SQL editor — no programmatic way to run raw DDL against the
    live project exists from here (no direct Postgres connection string,
    only the REST API + service-role key).
    `src/lib/billing/`: `paddleClient.ts` (sandbox/production API base
    switch via `PADDLE_ENVIRONMENT`, real HMAC-SHA256 webhook signature
    verification per Paddle's `ts=...;h1=...` format, customer-portal
    session creation), `limits.ts` (`getMainnetDeployLimitStatus()` —
    real exact count of the signed-in user's mainnet deploys since the
    start of the current UTC month).
    `/api/webhooks/paddle` — the ONLY place tier/paddle_* columns are
    ever written; verifies the signature before trusting the payload,
    maps `custom_data.app_user_id` (passed at Paddle.js checkout time)
    back to the profile row, sets tier pro/free on
    subscription.created/updated/activated vs canceled/paused.
    `/api/billing/portal` — authenticated route returning a Paddle
    customer-portal URL for Pro users to self-manage/cancel.
    `PaddleCheckoutButton.tsx` (lazy-loads `@paddle/paddle-js` on click,
    not on page load) and `ManageSubscriptionButton.tsx` — both fail
    gracefully with a friendly message when Paddle isn't configured yet,
    matching the Slither/Alchemy pattern, rather than crashing.
    `/dashboard/settings` replaces its Coming Soon stub with a real
    Billing page (current plan, usage-this-month, upgrade/manage
    button). Landing page gets a new `PricingSection` (Free vs Pro cards)
    using the same `plans.ts`.
    Mainnet-deploy gating threads `mainnetLimitStatus` from each page
    (`token-factory/page.tsx`, `memecoin-factory/page.tsx`, both server
    components) down through `TokenFactoryClient`/`MemecoinFactoryClient`
    → `ContractPipelinePanel` → `DeploySection`, which blocks the Deploy
    button and shows an upgrade prompt when a Free user has hit their
    monthly mainnet limit (same pattern as the existing audit-score
    gate).
    **Verified live** with a temp Supabase user (deleted after, cascade
    confirmed): Settings page correctly showed "Current plan: Free" and
    "0/1 mainnet deploys used this month"; clicking Upgrade correctly
    showed "Pro checkout isn't set up yet" (no real Paddle
    client-token/price-id configured); after seeding one real mainnet
    deployment, Settings correctly updated to "1/1". The webhook's HMAC
    verification was unit-tested in isolation (valid signature accepted,
    tampered body / wrong secret / missing header all correctly
    rejected) since no real Paddle webhook can be sent without a live
    account. **NOT verified live:** the actual DeploySection mainnet-
    limit banner/disabled-button — no mainnet chain has a `factoryAddress`
    yet (same real-world gap noted since step 9), so no mainnet option
    exists in the deploy chain selector to trigger it against. The
    underlying data (limit status computation) is proven correct via the
    Settings page render; the JSX gating logic is simple, type-checked,
    and reviewed, but not eyeballed live.
    Incident during this step: running `npm install` (adding
    `@paddle/paddle-js`) while the dev preview server was active
    corrupted `.next` the same way `npm run build` did in step 12 —
    fixed the same way (stop server, `rm -rf .next`, restart). **Broadened
    rule: don't run `npm install` OR `npm run build` while the dev
    preview server is active.**

15. **PWA finalization** — built & verified. A read-only audit first
    (spawned as an Explore-style agent) found the scaffold's PWA setup
    was incomplete in ways that would visibly break on real devices:
    - **Broken maskable icons** — `manifest.json` declared
      `"purpose": "any maskable"` on `icon-192.png`/`icon-512.png`, but
      that artwork (the full tree/cube illustration with captions) bleeds
      to the canvas edge with zero safe-zone padding. Android's adaptive
      icon masks (circle/squircle) would have cropped the tree top and
      caption text. Fixed by generating true maskable variants
      (`icon-maskable-192.png`, `icon-maskable-512.png` via `sharp`,
      scratch script, not committed) — same real brand art, just
      recentered at ~62% scale on the `#050816` brand background so all
      content sits inside the safe zone. Manifest now has 4 icon entries:
      the original two as `purpose: "any"`, the two new ones as
      `purpose: "maskable"`. No new artwork was invented — this reuses
      the existing approved illustration, just composited correctly.
    - **No runtime caching strategy** — `next.config.mjs` only precached
      Next's own JS/CSS chunks; nothing cached pages, API responses,
      fonts, or images. Fixed by wiring the package's own
      `runtimeCaching` export (`import withPWAInit, { runtimeCaching }
      from "@ducanh2912/next-pwa"`) into `workboxOptions.runtimeCaching`.
      Verified in the built `public/sw.js`: 7 NetworkFirst + 7
      StaleWhileRevalidate + 4 CacheFirst routes now registered.
    - **No offline fallback page** — added `src/app/~offline/page.tsx`
      (branded "You're offline" screen, matches the app's dark theme,
      no data fetching so it always renders). The package auto-detects
      this exact path/convention; confirmed in the built service worker
      via `importScripts("/fallback-....js")` and `self.fallback(e)`
      wired into every route's `handlerDidError`.
    - **No iOS splash screens** — iOS ignores the web manifest for splash
      screens entirely; without explicit `apple-touch-startup-image`
      links the installed app flashes blank white on launch. Generated
      11 sizes covering the common iPhone/iPad matrix (same brand icon,
      centered on the brand background) and wired them into
      `layout.tsx`'s `appleWebApp.startupImage` with the correct
      device-width/height/pixel-ratio media queries for each.
    - Minor: added `"scope": "/"` to the manifest. Added
      `/public/fallback-*.js` (+ `.map`) to `.gitignore` — a new
      generated-artifact type introduced by the offline-fallback feature
      that the original PWA `.gitignore` entries didn't anticipate.
    - One audit finding turned out to be wrong: `src/app/favicon.ico`
      already existed (Next.js App Router convention file) — no action
      needed there.
    Verified: manifest fetch returns all 4 icons + `scope`; all new
    icon/splash files serve 200; 11 `apple-touch-startup-image` links
    present in `<head>`; offline page renders correctly in the browser;
    production build's `sw.js` inspected directly to confirm the runtime
    caching rules and offline-fallback wiring are real, not just
    configured-but-inert. Type-check and production build both clean.

Open items before Paddle can process a real payment:
- Owner needs an actual Paddle account (sandbox to start) with a
  Product/Price created, then paste `PADDLE_API_KEY`,
  `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, and
  `NEXT_PUBLIC_PADDLE_PRICE_ID_PRO` into `.env.local` (see
  `.env.example` for the full list — same "owner action I can't do"
  pattern as the Slither service / Alchemy key).
- Re-run `supabase/schema.sql` in the Supabase SQL editor to add the new
  `profiles` columns (see above).
- Register the webhook URL (`/api/webhooks/paddle`) in the Paddle
  dashboard once a real domain/tunnel exists to receive it.
- Real pricing numbers are still a placeholder — revisit before charging
  anyone real money.

16. **Security hardening pass** — built & verified. First attempt at a
    subagent-based audit hit a session usage limit before producing any
    findings — did the audit directly instead (API routes, headers,
    middleware, RLS, secrets handling, `npm audit`, XSS/SSRF vectors,
    rate-limit coverage), reading the real source rather than trusting
    a canned checklist.
    - **Real finding: `POST /api/deployments` trusted the client for
      almost everything** — `chain` accepted any string (polluting the
      "chains used" stats with junk), and `audit_score` was taken
      straight from the request body, meaning an authenticated user
      could POST a fabricated row and fraudulently earn the "Mainnet
      Pioneer" or "Perfect Audit Score" achievement badges without ever
      deploying or auditing anything, since this table also feeds CORE's
      admin stats and the public token page. Fixed: `chain` now must
      match a real `OSCAR_CHAINS` key, `contract_address`/`tx_hash` are
      format-validated (regex), and `audit_score` is no longer accepted
      from the client at all — it's looked up server-side from the
      user's own most recent real `audit_reports` row instead.
      **Not fixed (flagged as real follow-up work, not attempted here):**
      full on-chain proof that a deployment actually happened — decoding
      the factory's real `TokenDeployed` event from the transaction
      receipt, mirroring what `/api/verify-contract` already does, and
      handling EIP-7702 relayed transactions the same way `task_6f7a3511`
      is meant to fix there. Format validation closes the cheap/obvious
      spoofing path; a user could still fabricate a syntactically-valid
      fake tx hash/address today. **Fixed 2026-07-10 — see step 18.**
    - **Rate limiting was only on `/api/generate` and `/api/audit`.**
      Added to `/api/deployments`, `/api/verify-contract`,
      `/api/auth/nonce`, `/api/auth/siwe`, and `/api/billing/portal`.
      `src/lib/ratelimit.ts` was refactored from one shared global bucket
      to named per-route buckets (`generate`/`audit` stay strict at 5-per-
      5-min since they're expensive AI calls; the rest get a more
      generous 15–20-per-5-min) — a single shared bucket would have meant
      a legitimate user's normal flow (nonce → sign in → generate → audit
      → deploy) could trip one expensive-call limit well before actually
      abusing anything, a real functional regression a hardening pass
      should not introduce.
    - **Added a real Content-Security-Policy and HSTS** to
      `next.config.mjs` (neither existed before — only X-Frame-Options/
      X-Content-Type-Options/Referrer-Policy/Permissions-Policy did).
      Deliberately NOT maximally strict: wagmi's default RPC transports
      hit whichever public RPC each of the 20 chains happens to use, with
      no fixed enumerable domain list, and wallet SDKs commonly need
      `'unsafe-eval'`/`'unsafe-inline'` — so `connect-src`/`script-src`
      stay broad. Still meaningfully restricts `default-src`,
      `object-src`, `frame-ancestors`, and `base-uri`. **Verified:** zero
      CSP console violations on the landing page, login page (including
      opening the real RainbowKit "Connect a Wallet" modal — Rainbow/
      Base/MetaMask/WalletConnect all listed correctly), dashboard,
      Settings/Billing (including clicking Upgrade to Pro), Token
      Factory, and `/core` + `/core/sentinel` as a real promoted owner
      test user. **NOT verified:** an actual WalletConnect relay
      connection or a real wallet's live RPC calls — no wallet extension
      exists in this environment. Watch the console for CSP violations
      the first time a real wallet connects.
    - **`npm audit`: 32 vulnerabilities (26 moderate, 6 high), zero of
      them fixable by plain `npm audit fix`** — confirmed via dry run,
      every single one requires `--force`, which here means a major
      version bump (`next` 14→16, dragging `wagmi`/`@rainbow-me/
      rainbowkit`/`@ducanh2912/next-pwa` with it). Deliberately NOT
      attempted — an unprompted 2-major-version Next.js upgrade across an
      app this size is a real migration project of its own (breaking
      App Router/config changes are likely), not something to slip into
      a hardening pass. `next` itself carries several HIGH-severity
      advisories worth knowing about specifically: an SSRF via WebSocket
      upgrades (CVSS 8.6), a middleware/proxy auth bypass in i18n Pages
      Router apps (CVSS 7.5, not applicable here — this app doesn't use
      Pages Router i18n), and a couple of Server Components DoS issues
      (CVSS 7.5). Flag for a deliberately-scoped upgrade + full regression
      test later, not a same-session fix.
    - Reviewed and found **no action needed**: RLS policies (every table
      correctly scoped, self-escalation genuinely blocked, verified
      against the schema directly); secrets handling (no service-role or
      API keys logged anywhere, `createAdminClient` only ever imported
      from server-only files, enforced by its own `import "server-only"`
      guard); XSS (zero `dangerouslySetInnerHTML` anywhere in `src/`,
      React's default escaping relied on everywhere including AI-
      generated Solidity/contract names); SSRF (every server-side
      `fetch()` to Slither/Alchemy/Paddle/Etherscan is built from env vars
      or the hardcoded `OSCAR_CHAINS` config, never unvalidated user
      input); middleware gating (no bypass found in the `/dashboard` +
      `/core` matcher logic).
    Type-check and production build both clean (after two more `rm -rf
    .next` cycles — one from the standing dev-server-vs-build rule, one
    from an unrelated intermittent Windows filesystem race on a fresh
    `.next` that resolved on retry).

17. **Gas Price Widget wired to real Alchemy data** — built &
    live-verified. This was the dashboard's last placeholder card.
    `src/lib/dashboard/gasPrices.ts` (`getGasPrices()`) calls Alchemy
    `eth_gasPrice` for all 10 mainnet chains in parallel (per-request
    timeout, `next: { revalidate: 30 }` so a busy dashboard doesn't
    hammer 10 RPCs), and only returns chains that actually respond — a
    failed RPC is dropped, never shown as a fabricated number. The
    fabricated up/down "trend" arrows were removed entirely: a single
    snapshot has no direction, and gas magnitude isn't comparable across
    chains (Polygon's ~285 gwei is cheap, Ethereum's ~0.1 gwei coloring
    would mislead), so per the "no fake stats" rule the widget now shows
    only the real current price. `formatGwei()` keeps significant figures
    for sub-0.001-gwei L2s so a real nonzero price never collapses to a
    misleading "0" (Scroll rendered "0.00012", not "0"). `GasPriceWidget`
    dropped its `trend` field and gained an honest empty state ("Live gas
    prices are unavailable right now") for when Alchemy isn't configured.
    **`ALCHEMY_API_KEY` is now set in the app's `.env.local`** (the same
    working key already in `contracts/.env`) — this also partially
    unblocks `/api/verify-contract` (still needs `ETHERSCAN_API_KEY` +
    the EIP-7702 fix). Verified live as a temp Supabase user (deleted
    after): all 10 chains rendered real live values (Ethereum 0.103, Base
    0.006, Polygon 285, Scroll 0.00012, etc.), zero console errors,
    type-check + production build clean.

    Also this session: **GPT-4o failover mechanism verified live** (no
    code change — pure verification). See the "Live API test" section
    above for the full detail: temporarily broke Claude's key, one real
    `/api/generate` returned the graceful 503, and the server log proved
    GPT-4o was actually reached as the fallback (`Fallback provider error
    429` from `callGpt4o`). Only the GPT-4o *success* path stays unproven
    until the OpenAI key has real quota.

18. **On-chain proof for `POST /api/deployments`** (2026-07-10) — built &
    live-tested. Closes step 16's remaining deployment-spoofing gap: an
    authenticated user could previously POST a syntactically-valid but
    fabricated deployment row (feeding badges, CORE stats, and the public
    token page). New `src/lib/contracts/proveDeployment.ts` fetches the tx
    receipt via Alchemy and requires the factory's own `TokenDeployed`
    event (from the chain's real factory address in `chains.ts`) whose
    `token` arg matches the claimed contract address — receipt logs, NOT
    `tx.input` decoding, so EIP-7702/relayed smart-account transactions
    work (unlike `/api/verify-contract`, which still has that bug —
    `task_6f7a3511`). Fails CLOSED (no Alchemy key / RPC down → row
    rejected), same rationale as the audit gate. The route now also:
    takes `token_name`/`token_symbol` from the on-chain event instead of
    the body, derives `is_mainnet` from the chain key instead of trusting
    the client, and rejects a tx hash already recorded by ANY user
    (service-role dup check — otherwise a second user could re-claim
    someone else's real deployment). `DeploySection` needed no changes
    (its extra body fields are now simply ignored).
    Verified live against the real Base Sepolia factory with a temp
    Supabase user (deleted after; real rows untouched): fabricated tx →
    400 "not found on chain"; real EIP-7702 TestDog tx + wrong token
    address → 400 "didn't deploy this token" (proves receipt-log decoding
    works on relayed txs); real tx + real address → proof passed, then
    409 duplicate (proof-first ordering means the 409 exercises the full
    success path); chain without a factory → 400. Type-check + production
    build clean. Not exercisable live: a brand-new proven insert (needs a
    fresh on-chain deploy) — that insert path is unchanged from the
    already-verified flow.

### Next steps (build order not yet done)

**PAUSED HERE (2026-07-07) — security hardening pass (step 16) built &
verified. This was the last item in the original build order.** Real
open items remain (see step 16's "not fixed" notes, `task_6f7a3511`
EIP-7702 fix, `task_b8920eea` CORE extra security layers, the deferred
Next.js major-version upgrade, and every "owner action required" item
scattered through this file — Slither service deploy, Alchemy/Etherscan
keys, real Paddle account, factory deploys on the other 9 chains) but
there is no more queued net-new feature work. Confirm with the user
what's next — likely picking up one of those open items, or a genuinely
new feature not yet discussed. (Embeddable public audit-score badges,
CORE's "user management" / SENTINEL's "abuse monitoring" variants, and
real Paddle pricing were all considered/deferred — see their respective
steps above.)**

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
10), the full landing page is done (step 11), achievement badges are
done (step 12), oscAr CORE + SENTINEL is done (step 13), the Paddle
billing plumbing is done (step 14 — genuinely blocked on the owner
setting up a real Paddle account before it can be tested further), PWA
finalization is done (step 15), and the security hardening pass is done
(step 16 above) — this was the last item in the original build order,
so there's no more queued net-new feature work; see step 16 for what's
still genuinely open (deployment-spoofing fix, Next.js major upgrade)
rather than done. Two background tasks are also outstanding from
earlier in the day — check their status before assuming they're still
open: `task_6f7a3511` (EIP-7702 fix for `/api/verify-contract`) and
`task_b8920eea` (extra CORE admin security layers using the
long-unused `OSCAR_CORE_*` env vars).

Deferred / later:

- 2FA (authenticator app) + login history / device management (deferred
  slice of the auth step).
- zkSync factory deploy (needs zksolc, deferred separately from the 9
  standard-EVM chains).

### Dev notes

- Run the dev server via the Preview tool using `.claude/launch.json`
  (name `oscar-dev`). It points at `dev-server.cmd`, a wrapper that fixes
  the Node PATH for the sandbox launcher — don't replace it with a bare
  `npm run dev` command, that fails to resolve `node` in this environment.
- Verify UI changes in the browser (Preview tools), not just by building.
