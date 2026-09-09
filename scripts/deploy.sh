#!/usr/bin/env bash
# Deploy Logikchain to a Firebase alias. Always passes --project <alias>.
# Usage: scripts/deploy.sh <emulator|dev|test|prod> [--only targets] [--ci-recovery]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ALIAS="${1:-}"
shift || true
ONLY=""
CI_RECOVERY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) ONLY="${2:-}"; shift 2 ;;
    --ci-recovery) CI_RECOVERY=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$ALIAS" ]]; then
  echo "Usage: scripts/deploy.sh <emulator|dev|test|prod> [--only targets] [--ci-recovery]" >&2
  exit 1
fi

case "$ALIAS" in
  emulator|dev|test|prod) ;;
  *) echo "Alias must be emulator, dev, test, or prod — never a project ID." >&2; exit 1 ;;
esac

if [[ "$ALIAS" == "emulator" ]]; then
  echo "Starting emulator playbook (no firebase deploy)."
  (cd functions && { [[ -d node_modules ]] || npm install; } && npm run build)
  exec firebase emulators:start --only auth,firestore,functions,storage,pubsub
fi

if [[ "$ALIAS" == "prod" ]]; then
  echo "Local prod deploy is forbidden. Production is CI on tag v* only." >&2
  exit 1
fi

if [[ "$ALIAS" == "test" && "$CI_RECOVERY" -ne 1 ]]; then
  echo "test is CI on every merge to main. Pass --ci-recovery only to recover broken CI, and log the deploy." >&2
  exit 1
fi

if [[ -z "$ONLY" ]]; then
  ONLY="functions,firestore:rules,firestore:indexes,storage,hosting"
fi

ENV_FILE="functions/.env.${ALIAS}"
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading ${ENV_FILE} (non-secrets)."
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

(cd functions && { [[ -d node_modules ]] || npm install; } && npm run build)

echo "firebase deploy --project ${ALIAS} --only ${ONLY} --non-interactive"
exec firebase deploy --project "$ALIAS" --only "$ONLY" --non-interactive
