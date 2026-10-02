#!/usr/bin/env bash
# Logikchain - Bruno API Test Runner (Cross-platform)
# Usage:
#   ./scripts/run-bruno-tests.sh [--env dev|emulator] [--group <folder>] [--api <path>] [--smoke] [--all] [--token <jwt>]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRUNO_DIR="$REPO_ROOT/tests/bruno"

ENV_NAME="dev"
GROUP=""
API=""
SMOKE=false
ALL=false
TOKEN=""
APP_CHECK_TOKEN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_NAME="$2"
      shift 2
      ;;
    --group)
      GROUP="$2"
      shift 2
      ;;
    --api)
      API="$2"
      shift 2
      ;;
    --smoke)
      SMOKE=true
      shift
      ;;
    --all)
      ALL=true
      shift
      ;;
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --appcheck)
      APP_CHECK_TOKEN="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

echo "=========================================================="
echo " Logikchain - Bruno API Test Runner"
echo " Target Environment: $ENV_NAME"
echo "=========================================================="

cd "$BRUNO_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing Bruno dependencies..."
  npm install
fi

if [ -n "$TOKEN" ]; then
  export accessToken="$TOKEN"
fi

if [ -n "$APP_CHECK_TOKEN" ]; then
  export appCheckToken="$APP_CHECK_TOKEN"
fi

CLI_ARGS=("run")

if [ -n "$API" ]; then
  CLI_ARGS+=("$API")
elif [ -n "$GROUP" ]; then
  CLI_ARGS+=("$GROUP")
fi

CLI_ARGS+=("--env" "$ENV_NAME")

if [ "$SMOKE" = true ]; then
  CLI_ARGS+=("--tags" "smoke")
elif [ "$ALL" = false ]; then
  CLI_ARGS+=("--exclude-tags" "webhook,manual")
fi

echo "Executing: npx bru ${CLI_ARGS[*]}"
npx bru "${CLI_ARGS[@]}"
