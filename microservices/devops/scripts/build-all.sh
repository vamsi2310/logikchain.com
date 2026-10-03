#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo " Building All Logikchain Microservices Containers"
echo "========================================================"

cd "$(dirname "$0")/../.."

SERVICES=(
  "identity-service"
  "orders-service"
  "gigs-service"
  "pamphlet-service"
  "payments-service"
  "payouts-service"
  "cash-service"
  "credit-service"
  "finance-service"
  "config-service"
  "governance-service"
)

echo "Building API Gateway..."
docker build -t logikchain/gateway:latest -f devops/docker/Dockerfile.gateway .

echo "Building Sync Engine..."
docker build -t logikchain/sync-engine:latest -f devops/docker/Dockerfile.sync-engine .

for SVC in "${SERVICES[@]}"; do
  echo "Building $SVC..."
  docker build -t "logikchain/$SVC:latest" --build-arg "SERVICE_NAME=$SVC" -f devops/docker/Dockerfile.service .
done

echo "========================================================"
echo " All Microservices Built Successfully!"
echo "========================================================"
