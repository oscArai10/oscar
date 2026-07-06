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

Last updated: 2026-07-06. Build order is being followed step by step; the
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
   reference image; palette verified pixel-exact. Currently uses
   PLACEHOLDER data — wire to Supabase/Alchemy in the dashboard step.
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
   `src/lib/chains/chains.ts` (factoryAddress).

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

### Next steps (build order not yet done)

**IMMEDIATE NEXT STEP → Slither audit microservice + audit pass.** Contract
layer is done (step 6). Next in the build order is the automated security
audit: a Dockerized Slither microservice (Railway/Fly.io) exposing one
internal API (POST contract code → Slither JSON findings), called
server-side from the app with an internal API key; then the audit pass
that combines Slither + AI review into the four scores (Security / Gas /
Code Quality + overall) with the ≥80 gate that blocks mainnet. Slither is
Python and CANNOT run in Vercel functions — it MUST be the separate
service.
Alternatives the user may prefer first: (a) wire the dashboard to real
Supabase data, or (b) the end-to-end deploy flow (testnet → RainbowKit
mainnet via the factory → explorer verify → token page) — though the
deploy flow ideally comes after the audit gate. Confirm with the user.

Deferred / later:

- 2FA (authenticator app) + login history / device management (deferred
  slice of the auth step).
- Owner deploys the factory contracts on-chain (runs
  `contracts/scripts/deploy-factory.ts` per chain, funds gas) and records
  each address in `src/lib/chains/chains.ts`. zkSync via zksolc separately.
- Slither audit microservice (Dockerized, Railway/Fly.io), then the audit
  pass + scores (≥80 gate for mainnet).
- Full end-to-end deploy flow (testnet → RainbowKit mainnet via factory →
  explorer verify → token page).
- Wire dashboard to real data; Memecoin Factory; full landing page;
  badges; Paddle/Lemon Squeezy Pro; oscAr CORE (triple-layer auth) +
  SENTINEL; PWA finalization; security hardening pass.

### Dev notes

- Run the dev server via the Preview tool using `.claude/launch.json`
  (name `oscar-dev`). It points at `dev-server.cmd`, a wrapper that fixes
  the Node PATH for the sandbox launcher — don't replace it with a bare
  `npm run dev` command, that fails to resolve `node` in this environment.
- Verify UI changes in the browser (Preview tools), not just by building.
