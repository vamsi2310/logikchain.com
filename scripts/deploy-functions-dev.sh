#!/usr/bin/env bash
# Deploy Cloud Functions to DEV (logikchaindevelopment).
# Usage: ./scripts/deploy-functions-dev.sh [--only-function <name>] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy-functions.sh" dev "$@"
