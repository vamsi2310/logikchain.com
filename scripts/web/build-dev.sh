#!/usr/bin/env bash
# Build the Web App for DEV environment.
# Usage: ./scripts/web/build-dev.sh [--clean] [--check-only]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/build.sh" dev "$@"
