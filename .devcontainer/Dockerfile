FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget git \
    r-base \
    && rm -rf /var/lib/apt/lists/*

RUN wget -O /tmp/quarto.deb \
    "https://github.com/quarto-dev/quarto-cli/releases/latest/download/quarto-linux-amd64.deb" \
    && apt-get update \
    && apt-get install -y /tmp/quarto.deb \
    && rm -f /tmp/quarto.deb \
    && rm -rf /var/lib/apt/lists/*