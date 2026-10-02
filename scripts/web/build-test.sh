#!/usr/bin/env bash
# Build the Web App for TEST environment.
# Usage: ./scripts/web/build-test.sh [--clean] [--check-only]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/build.sh" test "$@"
