#!/usr/bin/env bash
# Build Cloud Functions (TypeScript compilation to functions/lib).
# Usage: ./scripts/build-functions.sh [--clean] [--watch] [--check-only]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CLEAN=0
WATCH=0
CHECK_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean) CLEAN=1; shift ;;
    --watch) WATCH=1; shift ;;
    --check-only) CHECK_ONLY=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

echo "=========================================================="
echo " Logikchain — Build Cloud Functions"
echo "=========================================================="

cd functions

if [[ ! -d "node_modules" ]]; then
  echo "node_modules not found in functions directory. Installing dependencies..."
  npm install
fi

if [[ "$CLEAN" -eq 1 ]]; then
  if [[ -d "lib" ]]; then
    echo "Cleaning previous build output (functions/lib)..."
    rm -rf lib
  fi
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  echo "Running TypeScript type check (no emit)..."
  exec npm run lint
fi

if [[ "$WATCH" -eq 1 ]]; then
  echo "Starting TypeScript compiler in watch mode..."
  exec npm run build:watch
fi

echo "Compiling TypeScript (tsc)..."
npm run build

if [[ ! -f "lib/index.js" ]]; then
  echo "Error: Build completed but lib/index.js not found!" >&2
  exit 1
fi

echo " Functions build completed successfully -> functions/lib/"
