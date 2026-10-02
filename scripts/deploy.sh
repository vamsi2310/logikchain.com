#!/usr/bin/env bash
# Main entrypoint: Deploy Logikchain stack (all components) to a Firebase alias.
# Delegates to scripts/stack/deploy.sh.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/stack/deploy.sh" "$@"
