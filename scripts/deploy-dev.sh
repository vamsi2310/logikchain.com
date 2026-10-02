#!/usr/bin/env bash
# Deploy all Logikchain components (functions, firestore, storage, hosting) to DEV.
# Usage: ./scripts/deploy-dev.sh [--only targets] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" dev "$@"
