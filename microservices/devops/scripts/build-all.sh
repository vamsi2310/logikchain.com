#!/usr/bin/env bash
set -euo pipefail

echo "========================================================"
echo " Building All Logikchain Microservices Containers"
echo " (Gateway, Firebase Bridge & 12 Rust Domain Services)"
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
  "social-connect-service"
)

echo "[1/3] Building API Gateway..."
docker build -t logikchain/gateway:latest -f devops/docker/Dockerfile.gateway .

echo "[2/3] Building Firebase Bridge (:4050)..."
docker build -t logikchain/firebase-bridge:latest -f devops/docker/Dockerfile.firebase-bridge .

echo "[3/3] Building 12 Rust Microservices (Axum + SQLite WAL)..."
for SVC in "${SERVICES[@]}"; do
  echo "Building logikchain/${SVC}-rust:latest..."
  docker build -f rust-services/Dockerfile.rust-service \
    -t "logikchain/${SVC}-rust:latest" \
    --build-arg "SERVICE_NAME=$SVC" \
    rust-services
done

echo "========================================================"
echo " All Microservices Built Successfully!"
echo "========================================================"
