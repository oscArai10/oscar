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

### PENDING ISSUE — live API test not yet completed

The Token Factory is fully built and its UI states + failover chain are
verified, but a real end-to-end generation has NOT succeeded yet: **both
AI accounts are out of funds.** Anthropic key returns "credit balance too
low"; OpenAI key returns "insufficient_quota". Both keys are valid and
authenticate — they just have no credit. Keys are in `.env.local`
(gitignored). **Next session, once the user has funded at least the
Anthropic account, restart the dev server and run two live tests:**
(1) a MoonDog memecoin prompt → expect a real ERC20 + summary;
(2) the honeypot prompt ("only I can sell…") → expect a safety-filter
rejection. Security note: the user pasted these keys into chat, so they
should be rotated.

### Next steps (build order not yet done)

- Auth (SIWE + email/OTP + optional 2FA), Supabase schema with RLS from
  the start (structural PULSE/CORE separation).
- Contract layer (Hardhat): OpenZeppelin ERC20 + memecoin presets, then
  the per-chain oscAr Factory Contract (atomic fee-forward). Deploy
  scripts for the owner to run.
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
