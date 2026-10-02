#!/usr/bin/env bash
# Build and Deploy the Web App to PROD (logikchain-prod).
# Usage: ./scripts/web/deploy-prod.sh [--skip-build] [--force] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" prod "$@"
