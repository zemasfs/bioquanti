FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget git \
    r-base \
    && rm -rf /var/lib/apt/lists/*

# --- Quarto CLI (stable install via tarball) ---
ARG QUARTO_VERSION=1.5.57

RUN wget -qO /tmp/quarto.tar.gz \
      "https://github.com/quarto-dev/quarto-cli/releases/download/v${QUARTO_VERSION}/quarto-${QUARTO_VERSION}-linux-amd64.tar.gz" \
    && tar -xzf /tmp/quarto.tar.gz -C /opt \
    && ln -sf /opt/quarto-${QUARTO_VERSION}/bin/quarto /usr/local/bin/quarto \
    && rm -f /tmp/quarto.tar.gz