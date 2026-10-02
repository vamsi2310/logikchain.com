#!/usr/bin/env bash
# Deploy Cloud Functions to a specific Firebase alias (dev, test, prod).
# Usage: ./scripts/functions/deploy.sh <dev|test|prod> [--only-function <name>] [--skip-build] [--force] [--interactive]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ALIAS="${1:-}"
shift || true
ONLY_FUNCTION=""
FORCE=0
SKIP_BUILD=0
INTERACTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only-function) ONLY_FUNCTION="${2:-}"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --force) FORCE=1; shift ;;
    --interactive) INTERACTIVE=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$ALIAS" ]]; then
  echo "Usage: ./scripts/functions/deploy.sh <dev|test|prod> [--only-function <name>] [--skip-build] [--force] [--interactive]" >&2
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
echo " Logikchain — Deploy Cloud Functions ($ALIAS -> $PROJECT_ID)"
if [[ -n "$ONLY_FUNCTION" ]]; then
  echo " Target Filter: $ONLY_FUNCTION"
fi
echo "=========================================================="

if [[ "$ALIAS" == "prod" && "$FORCE" -ne 1 ]]; then
  echo " WARNING: You are about to deploy Cloud Functions to PRODUCTION!"
  echo " Project: $PROJECT_ID (prod)"
  read -r -p "Type 'yes' to proceed with production deployment: " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Deployment aborted by user."
    exit 0
  fi
fi

ENV_FILE="functions/.env.${ALIAS}"
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading ${ENV_FILE}..."
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ "$SKIP_BUILD" -ne 1 ]]; then
  echo "Building Cloud Functions..."
  "$(dirname "$0")/build.sh"
else
  echo "Skipping build step (--skip-build)."
fi

TARGET="functions"
if [[ -n "$ONLY_FUNCTION" ]]; then
  TARGET="functions:$ONLY_FUNCTION"
fi

DEPLOY_ARGS=("deploy" "--project" "$ALIAS" "--only" "$TARGET")
if [[ "$INTERACTIVE" -ne 1 ]]; then
  DEPLOY_ARGS+=("--non-interactive")
fi

echo "Executing: firebase ${DEPLOY_ARGS[*]}"
exec firebase "${DEPLOY_ARGS[@]}"
