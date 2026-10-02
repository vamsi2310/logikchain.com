#!/usr/bin/env bash
# Deploy all Logikchain components (functions, firestore, storage, hosting) to PROD.
# Usage: ./scripts/deploy-prod.sh [--only targets] [--force] [--interactive]
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/deploy.sh" prod "$@"
