#!/usr/bin/env bash
# Deploy Cloud Functions to PROD (logikchain-prod).
# Usage: ./scripts/functions/deploy-prod.sh [--only-function <name>] [--force] [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" prod "$@"
