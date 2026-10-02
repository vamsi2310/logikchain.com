#!/usr/bin/env bash
# Deploy Cloud Functions to TEST (logikchain-test).
# Usage: ./scripts/functions/deploy-test.sh [--only-function <name>] [--skip-build] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" test "$@"
