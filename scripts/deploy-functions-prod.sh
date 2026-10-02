#!/usr/bin/env bash
# Deploy Cloud Functions to PROD (logikchain-prod).
# Usage: ./scripts/deploy-functions-prod.sh [--only-function <name>] [--force] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy-functions.sh" prod "$@"
