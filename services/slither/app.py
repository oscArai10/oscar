"""oscAr Slither audit microservice.

A small internal API around the Slither static analyzer. Slither is a Python
tool and cannot run inside Vercel serverless functions, so it lives here as a
standalone service (Docker container on Railway/Fly.io) that the Next.js app
calls server-side over HTTPS with an internal API key.

POST /analyze  { source_code, contract_name } -> Slither findings, filtered to
the user's own contract file (OpenZeppelin library noise is dropped).
"""

import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="oscAr Slither audit service")

INTERNAL_API_KEY = os.environ.get("SLITHER_SERVICE_API_KEY")
# Baked into the Docker image at build time (vendored OpenZeppelin v5 source).
OZ_REMAP_PATH = os.environ.get("OZ_REMAP_PATH", "/opt/lib/@openzeppelin/contracts")
MAX_SOURCE_BYTES = 200_000
SLITHER_TIMEOUT_SECONDS = 90

_SAFE_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")


class AnalyzeRequest(BaseModel):
    source_code: str = Field(..., min_length=1, max_length=MAX_SOURCE_BYTES)
    contract_name: str = Field(..., min_length=1, max_length=64)


class Finding(BaseModel):
    check: str
    impact: Literal["High", "Medium", "Low", "Informational", "Optimization"]
    confidence: str
    description: str
    line: int | None = None


class AnalyzeResponse(BaseModel):
    ok: bool
    findings: list[Finding] = []
    detector_count_total: int = 0
    detector_count_relevant: int = 0
    compile_error: str | None = None


def _require_api_key(x_internal_api_key: str | None) -> None:
    if not INTERNAL_API_KEY:
        raise HTTPException(status_code=500, detail="Service misconfigured: no API key set.")
    if x_internal_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


def _safe_filename(contract_name: str) -> str:
    # Falls back to a generic name rather than rejecting — the audit still
    # needs to run even if the AI-generated contract_name is unusual.
    return contract_name if _SAFE_NAME.match(contract_name) else "Contract"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, x_internal_api_key: str | None = Header(default=None)):
    _require_api_key(x_internal_api_key)

    filename = f"{_safe_filename(req.contract_name)}.sol"

    with tempfile.TemporaryDirectory(prefix="oscar-audit-") as tmpdir:
        source_path = Path(tmpdir) / filename
        source_path.write_text(req.source_code, encoding="utf-8")
        json_out = Path(tmpdir) / "slither-out.json"

        try:
            proc = subprocess.run(
                [
                    "slither",
                    str(source_path),
                    "--solc-remaps",
                    f"@openzeppelin/contracts/={OZ_REMAP_PATH}/",
                    "--json",
                    str(json_out),
                ],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=SLITHER_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Analysis timed out.")

        if not json_out.exists():
            # Input was bad enough that Slither/solc crashed before writing any
            # output (e.g. not valid Solidity at all). This is a property of
            # the submitted contract, not a server fault — report it the same
            # way as a normal compile_error rather than a 500.
            error = (proc.stderr or proc.stdout or "Slither crashed before producing output.")[:2000]
            return AnalyzeResponse(ok=False, compile_error=error)

        import json

        result = json.loads(json_out.read_text(encoding="utf-8"))

        if not result.get("success"):
            error = str(result.get("error", "Unknown compile error"))[:2000]
            return AnalyzeResponse(ok=False, compile_error=error)

        detectors = result.get("results", {}).get("detectors", []) or []

        relevant: list[Finding] = []
        for d in detectors:
            elements = d.get("elements", []) or []
            files = {
                e.get("source_mapping", {}).get("filename_relative") for e in elements
            }
            # Only surface findings entirely within the user's own contract —
            # this drops OpenZeppelin library noise (e.g. its own dead-code or
            # pragma notes), which the user can't act on and didn't write.
            if files and files == {filename}:
                first_line = None
                if elements:
                    lines = elements[0].get("source_mapping", {}).get("lines", [])
                    first_line = lines[0] if lines else None
                relevant.append(
                    Finding(
                        check=d.get("check", "unknown"),
                        impact=d.get("impact", "Informational"),
                        confidence=d.get("confidence", "Low"),
                        description=str(d.get("description", ""))[:1000],
                        line=first_line,
                    )
                )

        return AnalyzeResponse(
            ok=True,
            findings=relevant,
            detector_count_total=len(detectors),
            detector_count_relevant=len(relevant),
        )
