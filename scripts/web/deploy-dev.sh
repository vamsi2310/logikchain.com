#!/usr/bin/env bash
# Build and Deploy the Web App to DEV (logikchaindevelopment).
# Usage: ./scripts/web/deploy-dev.sh [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" dev "$@"
