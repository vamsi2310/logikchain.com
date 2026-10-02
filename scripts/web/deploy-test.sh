#!/usr/bin/env bash
# Build and Deploy the Web App to TEST (logikchain-test).
# Usage: ./scripts/web/deploy-test.sh [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" test "$@"
