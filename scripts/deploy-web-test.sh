#!/usr/bin/env bash
# Build and Deploy the Web App to TEST (logikchain-test).
# Usage: ./scripts/deploy-web-test.sh [--skip-build] [--force] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy-web.sh" test "$@"
