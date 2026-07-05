# oscAr

**One Prompt. Deploy on 10+ Blockchains.**

AI-powered smart contract factory — non-custodial. Describe a token in plain
language; oscAr AI generates an audited, gas-optimized contract; you review a
plain-language audit report and deploy from your own wallet on any of 10 EVM
chains, paying your own gas. oscAr never holds funds or keys.

## Project layout

```
src/app/            Next.js app router (landing, PULSE dashboard, api routes)
src/components/     UI primitives + layout (design system)
src/lib/ai/         oscAr AI wrapper (primary + failover, server-side only)
src/lib/audit/      Audit pipeline client (Slither service + AI review)
src/lib/auth/       SIWE + email/OTP auth
src/lib/chains/     10 launch chains + testnets config
src/lib/db/         Supabase client + queries
contracts/          Hardhat workspace: token templates + oscAr Factory Contract
services/slither/   Slither audit microservice (Docker → Railway/Fly.io)
```

## Getting started

```bash
cp .env.example .env.local   # fill in real keys — never commit
npm install
npm run dev
```

## Non-negotiable rules

- Non-custodial always: no user funds, no private keys, no payments custody
- No mainnet deploy below audit score 80
- No honeypot / hidden-mint / rug patterns — filtered and refused
- All API keys server-side only
- No fake stats, ever
- AI providers are only ever called "oscAr AI" publicly
