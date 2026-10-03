#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-logikchain-dev}"
REGION="${2:-asia-south1}"
REPO="logikchain-microservices"
REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO"

echo "Deploying to GCP Project: $PROJECT_ID, Region: $REGION"

# Ensure Artifact Registry exists
gcloud artifacts repositories describe "$REPO" --location="$REGION" --project="$PROJECT_ID" 2>/dev/null || \
gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION" --project="$PROJECT_ID" --description="Logikchain Microservices"

echo "Configuring docker authentication..."
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

# Tag and push API Gateway
docker tag logikchain/gateway:latest "$REGISTRY/gateway:latest"
docker push "$REGISTRY/gateway:latest"

# Tag and push Sync Engine
docker tag logikchain/sync-engine:latest "$REGISTRY/sync-engine:latest"
docker push "$REGISTRY/sync-engine:latest"

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

for SVC in "${SERVICES[@]}"; do
  echo "Pushing $SVC..."
  docker tag "logikchain/$SVC:latest" "$REGISTRY/$SVC:latest"
  docker push "$REGISTRY/$SVC:latest"

  echo "Deploying $SVC to Cloud Run..."
  gcloud run deploy "$SVC" \
    --image="$REGISTRY/$SVC:latest" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
done

echo "Deploying API Gateway to Cloud Run (Public Ingress)..."
gcloud run deploy "api-gateway" \
  --image="$REGISTRY/gateway:latest" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --platform=managed \
  --allow-unauthenticated \
  --ingress=all

echo "Deployment completed successfully!"
