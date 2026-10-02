#!/usr/bin/env bash
# Build and Deploy the Web App (Hosting) to a specific Firebase alias (dev, test, prod).
# Usage: ./scripts/web/deploy.sh <dev|test|prod> [--skip-build] [--force] [--interactive]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ALIAS="${1:-}"
shift || true
SKIP_BUILD=0
FORCE=0
INTERACTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1; shift ;;
    --force) FORCE=1; shift ;;
    --interactive) INTERACTIVE=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$ALIAS" ]]; then
  echo "Usage: ./scripts/web/deploy.sh <dev|test|prod> [--skip-build] [--force] [--interactive]" >&2
  exit 1
fi

case "$ALIAS" in
  dev|test|prod) ;;
  *) echo "Error: Alias must be dev, test, or prod." >&2; exit 1 ;;
esac

case "$ALIAS" in
  dev) PROJECT_ID="logikchaindevelopment" ;;
  test) PROJECT_ID="logikchain-test" ;;
  prod) PROJECT_ID="logikchain-prod" ;;
esac

echo "=========================================================="
echo " Logikchain — Deploy Web App (Hosting) ($ALIAS -> $PROJECT_ID)"
echo "=========================================================="

if [[ "$ALIAS" == "prod" && "$FORCE" -ne 1 ]]; then
  echo " WARNING: You are about to deploy the Web App to PRODUCTION!"
  echo " Project: $PROJECT_ID (prod)"
  read -r -p "Type 'yes' to proceed with production deployment: " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Deployment aborted by user."
    exit 0
  fi
fi

if [[ "$SKIP_BUILD" -ne 1 ]]; then
  echo "Building Web App ($ALIAS)..."
  "$(dirname "$0")/build.sh" "$ALIAS"
else
  echo "Skipping build step (--skip-build)."
fi

if [[ ! -f "web/dist/index.html" ]]; then
  echo "Error: web/dist/index.html not found! Ensure build succeeds before deploying hosting." >&2
  exit 1
fi

DEPLOY_ARGS=("deploy" "--project" "$ALIAS" "--only" "hosting")
if [[ "$INTERACTIVE" -ne 1 ]]; then
  DEPLOY_ARGS+=("--non-interactive")
fi

echo "Executing: firebase ${DEPLOY_ARGS[*]}"
exec firebase "${DEPLOY_ARGS[@]}"
