FROM python:3.11-slim

# git only needed at build time (to vendor OpenZeppelin contracts); removed after.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pin the solc version to match the oscAr contracts (pragma ^0.8.24).
RUN solc-select install 0.8.24 && solc-select use 0.8.24

# Vendor OpenZeppelin v5 contract sources for import resolution during
# analysis. Slither needs the actual source, not just the compiled artifacts —
# generated tokens `import "@openzeppelin/contracts/..."` exactly as npm does.
ARG OZ_VERSION=v5.0.2
RUN git clone --depth 1 --branch ${OZ_VERSION} \
      https://github.com/OpenZeppelin/openzeppelin-contracts.git /tmp/oz-src \
    && mkdir -p /opt/lib/@openzeppelin \
    && cp -r /tmp/oz-src/contracts /opt/lib/@openzeppelin/contracts \
    && rm -rf /tmp/oz-src \
    && apt-get purge -y git && apt-get autoremove -y

ENV OZ_REMAP_PATH=/opt/lib/@openzeppelin/contracts

COPY app.py .

# Runs as a non-root user; Slither only needs to read/write its own temp dirs.
RUN useradd -m oscar
USER oscar

EXPOSE 8080
# Railway/Fly.io set $PORT; default to 8080 for local runs.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]
