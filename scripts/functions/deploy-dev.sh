#!/usr/bin/env bash
# Deploy Cloud Functions to DEV (logikchaindevelopment).
# Usage: ./scripts/functions/deploy-dev.sh [--only-function <name>] [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" dev "$@"
