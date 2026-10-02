#!/usr/bin/env bash
# Deploy all Logikchain components (functions, firestore, storage, hosting) to TEST.
# Usage: ./scripts/deploy-test.sh [--only targets] [--force|--ci-recovery] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" test "$@"
