#!/usr/bin/env bash
# Build and Deploy the Web App to DEV (logikchaindevelopment).
# Usage: ./scripts/deploy-web-dev.sh [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy-web.sh" dev "$@"
