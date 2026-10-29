#!/usr/bin/env bash
# ===========================================================================
# Logikchain Microservices Status & Health Checker (Bash / Linux / CI-CD)
# ===========================================================================

set -euo pipefail

echo ""
echo "================================================================================================"
echo "                    LOGIKCHAIN DEVOPS: MICROSERVICES HEALTH & PROCESS AUDIT                     "
echo "                                   Timestamp: $(date '+%Y-%m-%d %H:%M:%S')                     "
echo "================================================================================================"
printf "%-9s %-25s %-7s %-12s %-8s %-18s\n" "Epic" "Microservice" "Port" "State" "HTTP" "Database"
echo "------------------------------------------------------------------------------------------------"

services=(
  "EPIC-01:identity-service:4001:identity_db"
  "EPIC-02:orders-service:4002:orders_db"
  "EPIC-03:gigs-service:4003:gigs_db"
  "EPIC-04:pamphlet-service:4004:pamphlet_db"
  "EPIC-05:payments-service:4005:payments_db"
  "EPIC-06:payouts-service:4006:payouts_db"
  "EPIC-07:cash-service:4007:cash_db"
  "EPIC-08:credit-service:4008:credit_db"
  "EPIC-09:finance-service:4009:finance_db"
  "EPIC-10:config-service:4010:config_db"
  "EPIC-11:governance-service:4011:governance_db"
  "EPIC-12:gateway:8080:sync_db"
  "EPIC-13:social-connect-service:4012:social_connect_db"
)

online=0
degraded=0
offline=0

for item in "${services[@]}"; do
  IFS=":" read -r epic name port db <<< "$item"
  
  status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 "http://localhost:${port}/health" || echo "000")
  
  if [ "$status_code" -eq 200 ]; then
    state="[+] ONLINE"
    online=$((online + 1))
  elif [ "$status_code" -ge 500 ]; then
    state="[!] DEGRADED"
    degraded=$((degraded + 1))
  else
    state="[-] OFFLINE"
    offline=$((offline + 1))
  fi
  
  printf "%-9s %-25s :%-6s %-12s %-8s %-18s\n" "$epic" "$name" "$port" "$state" "$status_code" "$db"
done

echo "------------------------------------------------------------------------------------------------"
echo "Summary: $online Online | $degraded Degraded | $offline Offline / Unstarted"
echo ""

