#!/usr/bin/env bash
# Deploy Logikchain stack (all components) to DEV (logikchaindevelopment).
# Usage: ./scripts/stack/deploy-dev.sh [--only targets] [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" dev "$@"
