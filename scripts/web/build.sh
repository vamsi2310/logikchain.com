#!/usr/bin/env bash
# Build the Web App (Vite PWA multi-role entry points) for a specific target environment.
# Usage: ./scripts/web/build.sh [dev|test|prod] [--clean] [--check-only]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ALIAS="${1:-dev}"
if [[ "$ALIAS" =~ ^-- ]]; then
  ALIAS="dev"
else
  shift || true
fi

CLEAN=0
CHECK_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean) CLEAN=1; shift ;;
    --check-only) CHECK_ONLY=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

case "$ALIAS" in
  dev) BUILD_CMD="build:dev" ;;
  test) BUILD_CMD="build:test" ;;
  prod) BUILD_CMD="build:prod" ;;
  *) echo "Error: Alias must be dev, test, or prod." >&2; exit 1 ;;
esac

echo "=========================================================="
echo " Logikchain — Build Web App (Vite PWA)"
echo " Target Alias: $ALIAS ($BUILD_CMD)"
echo "=========================================================="

cd web

if [[ ! -d "node_modules" ]]; then
  echo "node_modules not found in web directory. Installing dependencies..."
  npm install
fi

if [[ "$CLEAN" -eq 1 ]]; then
  if [[ -d "dist" ]]; then
    echo "Cleaning previous build output (web/dist)..."
    rm -rf dist
  fi
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  echo "Running TypeScript type check (web/lint)..."
  exec npm run lint
fi

echo "Executing: npm run $BUILD_CMD..."
npm run "$BUILD_CMD"

if [[ ! -f "dist/index.html" ]]; then
  echo "Error: Build completed but web/dist/index.html not found!" >&2
  exit 1
fi

echo " Web App build completed successfully -> web/dist/"
