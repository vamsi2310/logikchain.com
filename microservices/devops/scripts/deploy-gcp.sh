#!/usr/bin/env bash
# ==============================================================================
# Automated Production Deployer for Google Cloud Run (Choice B Architecture)
# ==============================================================================
set -euo pipefail

PROJECT_ID="${1:-logikchaindevelopment}"
REGION="${2:-asia-south1}"
ENV="${3:-dev}"
REPO="logikchain-microservices"
REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO"

echo "================================================================================"
echo "      LOGIKCHAIN PRODUCTION / CLOUD RUN DEPLOYER (CHOICE B SERVERLESS)          "
echo "      Target Project: $PROJECT_ID | Region: $REGION | Env: $ENV                 "
echo "================================================================================"

# 1. Verify Artifact Registry
gcloud artifacts repositories describe "$REPO" --location="$REGION" --project="$PROJECT_ID" 2>/dev/null || \
gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION" --project="$PROJECT_ID" --description="Logikchain Microservices Containers"

# 2. Deploy 12 Isolated Domain Microservices with Private Ingress
SERVICES=(
  "identity-service:4001:identity_db"
  "orders-service:4002:orders_db"
  "gigs-service:4003:gigs_db"
  "pamphlet-service:4004:pamphlet_db"
  "payments-service:4005:payments_db"
  "payouts-service:4006:payouts_db"
  "cash-service:4007:cash_db"
  "credit-service:4008:credit_db"
  "finance-service:4009:finance_db"
  "config-service:4010:config_db"
  "governance-service:4011:governance_db"
  "social-connect-service:4012:social_connect_db"
)

declare -A SERVICE_URLS

for item in "${SERVICES[@]}"; do
  IFS=":" read -r SVC PORT DB <<< "$item"
  echo "Deploying $SVC (Port $PORT) to Cloud Run (Private Ingress)..."
  
  gcloud run deploy "$SVC" \
    --image="$REGISTRY/$SVC:latest" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --platform=managed \
    --port="$PORT" \
    --ingress=internal \
    --no-allow-unauthenticated \
    --min-instances=0 \
    --max-instances=10 \
    --memory=512Mi \
    --cpu=1 \
    --set-env-vars="NODE_ENV=$ENV,SYNC_INTERVAL_MS=2000,PORT=$PORT" \
    --quiet

  URL=$(gcloud run services describe "$SVC" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")
  SERVICE_URLS["$SVC"]="$URL"
done

# 3. Deploy API Gateway with Public Ingress and Direct Service Routing
echo "Deploying API Gateway with Public Ingress..."

GATEWAY_VARS="NODE_ENV=$ENV,PORT=8080"
if [ "$ENV" = "prod" ]; then
  GATEWAY_VARS="$GATEWAY_VARS,ENFORCE_APP_CHECK=true"
else
  GATEWAY_VARS="$GATEWAY_VARS,ENFORCE_APP_CHECK=false"
fi

GATEWAY_VARS="$GATEWAY_VARS,IDENTITY_SERVICE_URL=${SERVICE_URLS['identity-service']}"
GATEWAY_VARS="$GATEWAY_VARS,ORDERS_SERVICE_URL=${SERVICE_URLS['orders-service']}"
GATEWAY_VARS="$GATEWAY_VARS,GIGS_SERVICE_URL=${SERVICE_URLS['gigs-service']}"
GATEWAY_VARS="$GATEWAY_VARS,PAMPHLET_SERVICE_URL=${SERVICE_URLS['pamphlet-service']}"
GATEWAY_VARS="$GATEWAY_VARS,PAYMENTS_SERVICE_URL=${SERVICE_URLS['payments-service']}"
GATEWAY_VARS="$GATEWAY_VARS,PAYOUTS_SERVICE_URL=${SERVICE_URLS['payouts-service']}"
GATEWAY_VARS="$GATEWAY_VARS,CASH_SERVICE_URL=${SERVICE_URLS['cash-service']}"
GATEWAY_VARS="$GATEWAY_VARS,CREDIT_SERVICE_URL=${SERVICE_URLS['credit-service']}"
GATEWAY_VARS="$GATEWAY_VARS,FINANCE_SERVICE_URL=${SERVICE_URLS['finance-service']}"
GATEWAY_VARS="$GATEWAY_VARS,CONFIG_SERVICE_URL=${SERVICE_URLS['config-service']}"
GATEWAY_VARS="$GATEWAY_VARS,GOVERNANCE_SERVICE_URL=${SERVICE_URLS['governance-service']}"
GATEWAY_VARS="$GATEWAY_VARS,SOCIAL_CONNECT_SERVICE_URL=${SERVICE_URLS['social-connect-service']}"

MIN_INSTANCES=0
if [ "$ENV" = "prod" ]; then
  MIN_INSTANCES=1
fi

gcloud run deploy "api-gateway" \
  --image="$REGISTRY/gateway:latest" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --platform=managed \
  --port=8080 \
  --ingress=all \
  --allow-unauthenticated \
  --min-instances="$MIN_INSTANCES" \
  --max-instances=20 \
  --memory=512Mi \
  --cpu=1 \
  --set-env-vars="$GATEWAY_VARS" \
  --quiet

GATEWAY_URL=$(gcloud run services describe "api-gateway" --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")

echo "================================================================================"
echo "            DEPLOYMENT TO GOOGLE CLOUD RUN COMPLETED SUCCESSFULLY!              "
echo "================================================================================"
echo "API Gateway URL:  $GATEWAY_URL"
echo "Health Check:     $GATEWAY_URL/health"
echo "Cluster Status:   $GATEWAY_URL/health/services"
echo "Update web/.env.$ENV with: REACT_APP_API_BASE_URL=$GATEWAY_URL"
