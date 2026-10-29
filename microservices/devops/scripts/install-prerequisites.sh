#!/usr/bin/env bash
# =============================================================================
# Logikchain Platform Deployment - Automated Prerequisite Installer
# Reference: docs/DEPLOYMENT_GUIDE.md (Section 1)
# =============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}  LOGIKCHAIN PLATFORM - AUTOMATED PREREQUISITE INSTALLER${NC}"
echo -e "  Reference: docs/DEPLOYMENT_GUIDE.md (Section 1)"
echo -e "${CYAN}=================================================================${NC}\n"

# 1. Google Cloud SDK
echo -n "[1/5] Checking Google Cloud SDK (gcloud)... "
if command -v gcloud >/dev/null 2>&1; then
  echo -e "${GREEN}ALREADY INSTALLED${NC} ($(gcloud version 2>/dev/null | head -n 1))"
else
  echo -e "${YELLOW}INSTALLING...${NC}"
  echo "Downloading Google Cloud SDK install script..."
  curl https://sdk.cloud.google.com | bash
  # shellcheck source=/dev/null
  exec -l "$SHELL" || true
fi

# 2. Node.js
echo -n "[2/5] Checking Node.js Runtime... "
if command -v node >/dev/null 2>&1; then
  echo -e "${GREEN}OK${NC} ($(node -v))"
else
  echo -e "${RED}MISSING${NC}. Please install Node.js 22 LTS from https://nodejs.org/"
fi

# 3. Firebase CLI
echo -n "[3/5] Checking Firebase CLI... "
if command -v firebase >/dev/null 2>&1; then
  echo -e "${GREEN}ALREADY INSTALLED${NC} ($(firebase --version))"
else
  echo -e "${YELLOW}INSTALLING via npm...${NC}"
  npm install -g firebase-tools@latest
fi

# 4. Bruno CLI
echo -n "[4/5] Checking Bruno CLI... "
if command -v bru >/dev/null 2>&1; then
  echo -e "${GREEN}ALREADY INSTALLED${NC} ($(bru --version))"
else
  echo -e "${YELLOW}INSTALLING via npm...${NC}"
  npm install -g @usebruno/cli
fi

# 5. Playwright
echo -n "[5/5] Checking Playwright Test Engine... "
if [ -d "node_modules/@playwright/test" ]; then
  echo -e "${GREEN}ALREADY INSTALLED${NC}"
else
  echo -e "${YELLOW}INSTALLING in workspace...${NC}"
  npm install -D @playwright/test
  npx playwright install chromium
fi

echo -e "\n-----------------------------------------------------------------"
echo -e "${CYAN}        RUNNING POST-INSTALLATION PREREQUISITE AUDIT            ${NC}"
echo -e "-----------------------------------------------------------------\n"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/check-prerequisites.sh" ]; then
  chmod +x "$SCRIPT_DIR/check-prerequisites.sh"
  "$SCRIPT_DIR/check-prerequisites.sh"
fi
