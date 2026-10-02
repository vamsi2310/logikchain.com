#!/usr/bin/env bash
# Deploy Logikchain stack (all components) to TEST (logikchain-test).
# Usage: ./scripts/stack/deploy-test.sh [--only targets] [--force|--ci-recovery] [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" test "$@"
