# oscAr Slither audit service

Internal microservice wrapping the [Slither](https://github.com/crytic/slither)
static analyzer. Slither is a Python tool and cannot run inside Vercel
serverless functions, so it's a standalone Docker service the Next.js app
calls server-side over HTTPS with an internal API key — never exposed
publicly, never called from the browser.

## API

- `GET /health` — no auth; for the platform's health checks.
- `POST /analyze` — header `x-internal-api-key: <SLITHER_SERVICE_API_KEY>`.
  Body: `{ "source_code": "...", "contract_name": "MoonDog" }`.
  Returns `{ ok, findings: [{check, impact, confidence, description, line}], detector_count_total, detector_count_relevant }`.
  Findings are filtered to the user's own contract file — OpenZeppelin
  library noise (its own dead-code/pragma notes etc.) is dropped, since the
  user can't act on those and didn't write them.

## Deploy (owner, one-time)

**Railway:**
1. New Project → Deploy from repo → set the root directory to `services/slither`.
2. Set the env var `SLITHER_SERVICE_API_KEY` to a long random string (this is
   the same value that goes in the main app's `SLITHER_SERVICE_API_KEY`).
3. Railway builds the Dockerfile automatically and assigns a public URL —
   copy it into the main app's `SLITHER_SERVICE_URL`.

**Fly.io** (alternative): `fly launch` from this directory, then
`fly secrets set SLITHER_SERVICE_API_KEY=...`.

## Local dev (no Docker needed)

```bash
pip install -r requirements.txt
solc-select install 0.8.24 && solc-select use 0.8.24
# Vendor OpenZeppelin once (matches the Dockerfile's ARG OZ_VERSION):
git clone --depth 1 --branch v5.0.2 https://github.com/OpenZeppelin/openzeppelin-contracts.git /tmp/oz-src
mkdir -p /tmp/oz-lib/@openzeppelin && cp -r /tmp/oz-src/contracts /tmp/oz-lib/@openzeppelin/contracts

SLITHER_SERVICE_API_KEY=dev-key OZ_REMAP_PATH=/tmp/oz-lib/@openzeppelin/contracts \
  uvicorn app:app --reload --port 8080
```
