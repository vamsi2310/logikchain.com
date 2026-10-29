#!/usr/bin/env bash
# =============================================================================
# Logikchain Platform Deployment - Prerequisite Verification Script
# Reference: docs/DEPLOYMENT_GUIDE.md (Section 1)
# =============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}  LOGIKCHAIN PLATFORM DEPLOYMENT - PREREQUISITE CHECK${NC}"
echo -e "  Reference: docs/DEPLOYMENT_GUIDE.md (Section 1)"
echo -e "${CYAN}=================================================================${NC}\n"

ALL_PASSED=true

check_tool() {
  local tool_name="$1"
  local cmd="$2"
  local ver_cmd="$3"
  local req_ver="$4"
  local install_tip="$5"

  printf "[*] Checking %-28s ... " "$tool_name"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo -e "${RED}MISSING${NC} (Required: $req_ver)"
    echo -e "    ${YELLOW}Fix:${NC} $install_tip"
    ALL_PASSED=false
    return
  fi

  local detected_ver
  detected_ver=$(eval "$ver_cmd" 2>&1 | head -n 1 || true)
  echo -e "${GREEN}OK${NC} ($detected_ver)"
}

# 1. Google Cloud SDK
check_tool "Google Cloud SDK (gcloud)" "gcloud" "gcloud version | head -n 1 | awk '{print \$4}'" "490.0.0+" "Install: https://cloud.google.com/sdk/docs/install"

# 2. Docker Engine
check_tool "Docker Engine" "docker" "docker --version | awk '{print \$3}' | tr -d ','" "26.0.0+" "Install: https://docs.docker.com/engine/install/"

# Check Docker daemon connectivity
if command -v docker >/dev/null 2>&1; then
  printf "[*] Checking Docker Daemon Socket  ... "
  if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}RUNNING${NC}"
  else
    echo -e "${RED}DAEMON NOT RUNNING${NC}"
    echo -e "    ${YELLOW}Fix:${NC} Start the Docker service / desktop application"
    ALL_PASSED=false
  fi
fi

# 3. Node.js
check_tool "Node.js Runtime" "node" "node -v" "22.x LTS" "Install Node.js 22: https://nodejs.org/"

# 4. Firebase CLI
check_tool "Firebase CLI" "firebase" "firebase --version" "13.x+" "Run: npm install -g firebase-tools"

# 5. Playwright
printf "[*] Checking %-28s ... " "Playwright (E2E)"
if npx --no-install playwright --version >/dev/null 2>&1; then
  PW_VER=$(npx --no-install playwright --version 2>&1 | head -n 1)
  echo -e "${GREEN}OK${NC} ($PW_VER)"
else
  echo -e "${YELLOW}AVAILABLE VIA NPX${NC}"
fi

# 6. Bruno CLI
printf "[*] Checking %-28s ... " "Bruno CLI (API Testing)"
if command -v bru >/dev/null 2>&1; then
  echo -e "${GREEN}OK${NC} ($(bru --version 2>&1))"
else
  echo -e "${GREEN}RUNNABLE ON-DEMAND${NC} (via npx @usebruno/cli)"
fi

echo -e "\n-----------------------------------------------------------------"
if [ "$ALL_PASSED" = true ]; then
  echo -e "${GREEN}[PASS] All core deployment prerequisites are satisfied!${NC}"
  echo -e "You can proceed to Section 2 of docs/DEPLOYMENT_GUIDE.md."
  exit 0
else
  echo -e "${RED}[FAIL] Some prerequisites are missing or require attention.${NC}"
  echo -e "Please review the remediation instructions above."
  exit 1
fi
