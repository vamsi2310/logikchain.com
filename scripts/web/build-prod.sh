#!/usr/bin/env bash
# Build the Web App for PROD environment.
# Usage: ./scripts/web/build-prod.sh [--clean] [--check-only]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/build.sh" prod "$@"
