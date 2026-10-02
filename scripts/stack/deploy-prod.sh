#!/usr/bin/env bash
# Deploy Logikchain stack (all components) to PROD (logikchain-prod).
# Usage: ./scripts/stack/deploy-prod.sh [--only targets] [--force] [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" prod "$@"
