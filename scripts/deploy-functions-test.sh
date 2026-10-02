#!/usr/bin/env bash
# Deploy Cloud Functions to TEST (logikchain-test).
# Usage: ./scripts/deploy-functions-test.sh [--only-function <name>] [--force] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy-functions.sh" test "$@"
