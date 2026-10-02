#!/usr/bin/env bash
# Deploy Logikchain stack (functions, firestore, storage, hosting) to a Firebase alias.
# Usage: ./scripts/stack/deploy.sh <dev|test|prod> [--only targets] [--skip-build] [--force|--ci-recovery] [--interactive]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ALIAS="${1:-}"
shift || true
ONLY=""
FORCE=0
SKIP_BUILD=0
INTERACTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) ONLY="${2:-}"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --force|--ci-recovery) FORCE=1; shift ;;
    --interactive) INTERACTIVE=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$ALIAS" ]]; then
  echo "Usage: ./scripts/stack/deploy.sh <dev|test|prod> [--only targets] [--skip-build] [--force] [--interactive]" >&2
  exit 1
fi

case "$ALIAS" in
  dev|test|prod) ;;
  *) echo "Alias must be dev, test, or prod — never a project ID." >&2; exit 1 ;;
esac

case "$ALIAS" in
  dev) PROJECT_ID="logikchaindevelopment" ;;
  test) PROJECT_ID="logikchain-test" ;;
  prod) PROJECT_ID="logikchain-prod" ;;
esac

if [[ -z "$ONLY" ]]; then
  ONLY="functions,firestore:rules,firestore:indexes,storage,hosting"
fi

echo "=========================================================="
echo " Logikchain — Deploy Stack ($ALIAS -> $PROJECT_ID)"
echo " Targets: $ONLY"
echo "=========================================================="

if [[ "$ALIAS" == "prod" && "$FORCE" -ne 1 ]]; then
  echo " WARNING: You are deploying full stack to PRODUCTION!"
  echo " Project: $PROJECT_ID (prod)"
  echo " Targets: $ONLY"
  read -r -p "Type 'yes' to proceed with production deployment: " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Production deploy aborted."
    exit 0
  fi
fi

# 1. Build Web App if hosting is in target list
if [[ "$ONLY" =~ hosting && "$SKIP_BUILD" -ne 1 ]]; then
  echo "Building Web App for $ALIAS..."
  "$(dirname "$0")/../web/build.sh" "$ALIAS"
  if [[ ! -f "web/dist/index.html" ]]; then
    echo "Error: web/dist/index.html not found after build!" >&2
    exit 1
  fi
fi

# 2. Build Cloud Functions if functions is in target list
if [[ "$ONLY" =~ functions ]]; then
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
    "$(dirname "$0")/../functions/build.sh"
  fi
fi

DEPLOY_ARGS=("deploy" "--project" "$ALIAS" "--only" "$ONLY")
if [[ "$INTERACTIVE" -ne 1 ]]; then
  DEPLOY_ARGS+=("--non-interactive")
fi

echo "Executing: firebase ${DEPLOY_ARGS[*]}"
exec firebase "${DEPLOY_ARGS[@]}"
