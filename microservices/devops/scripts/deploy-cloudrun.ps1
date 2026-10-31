# ==============================================================================
# Automated Production Deployer for Google Cloud Run (Choice B Architecture)
# ==============================================================================
# Deploys:
#   1. All 12 Isolated Domain Microservices (Private Ingress, VPC / Service-to-Service)
#   2. Logikchain API Gateway (Public Ingress, AppCheck Enforced)
#   3. Sync Engine (Serverless / Background sync)
#
# Requirements:
#   - Google Cloud SDK (gcloud) authenticated with active project
# ==============================================================================

param (
    [string]$ProjectId = "logikchaindevelopment",
    [string]$Region = "asia-south1",
    [string]$Env = "dev",
    [switch]$BuildFirst,
    [switch]$SkipConfirmation
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "      LOGIKCHAIN PRODUCTION / CLOUD RUN DEPLOYER (CHOICE B SERVERLESS)          " -ForegroundColor Cyan
Write-Host "      Target Project: $ProjectId | Region: $Region | Env: $Env                   " -ForegroundColor Gray
Write-Host "================================================================================" -ForegroundColor Cyan

if (-not $SkipConfirmation) {
    $confirm = Read-Host "Proceed with deployment to GCP project '$ProjectId'? (y/n)"
    if ($confirm -ne 'y') {
        Write-Host "Deployment aborted by user." -ForegroundColor Yellow
        exit 0
    }
}

# 1. Verify gcloud CLI
Write-Host "`n[1/6] Verifying Google Cloud SDK..." -NoNewline
try {
    $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $activeAccount) { throw "No active gcloud credentials." }
    Write-Host " OK ($activeAccount)" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "Please run 'gcloud auth login' and try again." -ForegroundColor Yellow
    exit 1
}

# 2. Configure project context
Write-Host "[2/6] Setting active project context..." -ForegroundColor Cyan
gcloud config set project $ProjectId --quiet

# 3. Ensure Artifact Registry repository exists
$RepoName = "logikchain-microservices"
$Registry = "$Region-docker.pkg.dev/$ProjectId/$RepoName"

Write-Host "`n[3/6] Checking Google Artifact Registry ($RepoName)..." -ForegroundColor Cyan
$repoCheck = gcloud artifacts repositories describe $RepoName --location=$Region --project=$ProjectId 2>$null
if (-not $repoCheck) {
    Write-Host "Creating Artifact Registry repository '$RepoName' in $Region..." -ForegroundColor Yellow
    gcloud artifacts repositories create $RepoName `
        --repository-format=docker `
        --location=$Region `
        --project=$ProjectId `
        --description="Logikchain Microservices Containers"
} else {
    Write-Host "Artifact Registry repository verified." -ForegroundColor Green
}

# 4. Build containers via CloudBuild if requested
if ($BuildFirst) {
    Write-Host "`n[4/6] Submitting CloudBuild cluster build job..." -ForegroundColor Cyan
    gcloud builds submit --config=microservices/devops/ci-cd/cloudbuild.yaml microservices/
} else {
    Write-Host "`n[4/6] Skipping CloudBuild (using latest tagged images in registry)" -ForegroundColor Gray
}

# 5. Deploy Domain Microservices with Private Ingress & Cloud SQL integration
Write-Host "`n[5/6] Deploying 12 domain microservices to Cloud Run..." -ForegroundColor Cyan

$services = @(
    @{ Name = "identity-service";       Port = 4001; Db = "identity_db" },
    @{ Name = "orders-service";         Port = 4002; Db = "orders_db" },
    @{ Name = "gigs-service";           Port = 4003; Db = "gigs_db" },
    @{ Name = "pamphlet-service";       Port = 4004; Db = "pamphlet_db" },
    @{ Name = "payments-service";       Port = 4005; Db = "payments_db" },
    @{ Name = "payouts-service";        Port = 4006; Db = "payouts_db" },
    @{ Name = "cash-service";           Port = 4007; Db = "cash_db" },
    @{ Name = "credit-service";         Port = 4008; Db = "credit_db" },
    @{ Name = "finance-service";        Port = 4009; Db = "finance_db" },
    @{ Name = "config-service";         Port = 4010; Db = "config_db" },
    @{ Name = "governance-service";     Port = 4011; Db = "governance_db" },
    @{ Name = "social-connect-service"; Port = 4012; Db = "social_connect_db" }
)

$deployedUrls = @{}

foreach ($s in $services) {
    $svcName = $s.Name
    $port = $s.Port
    $image = "$Registry/$svcName`:latest"
    Write-Host "  -> Deploying $svcName (Port $port)..." -ForegroundColor White

    # Deploy internal microservice to Cloud Run
    gcloud run deploy $svcName `
        --image=$image `
        --region=$Region `
        --project=$ProjectId `
        --platform=managed `
        --port=$port `
        --ingress=internal `
        --no-allow-unauthenticated `
        --min-instances=0 `
        --max-instances=10 `
        --memory=512Mi `
        --cpu=1 `
        --set-env-vars="NODE_ENV=$Env,SYNC_INTERVAL_MS=2000,PORT=$port" `
        --quiet

    $svcUrl = gcloud run services describe $svcName --region=$Region --project=$ProjectId --format="value(status.url)" 2>$null
    $deployedUrls[$svcName] = $svcUrl
}

# 6. Deploy API Gateway with Public Ingress and Service Wiring
Write-Host "`n[6/6] Deploying API Gateway with Public Ingress..." -ForegroundColor Cyan

$gatewayEnvVars = @(
    "NODE_ENV=$Env",
    "PORT=8080",
    "ENFORCE_APP_CHECK=$(if ($Env -eq 'prod') { 'true' } else { 'false' })",
    "IDENTITY_SERVICE_URL=$($deployedUrls['identity-service'])",
    "ORDERS_SERVICE_URL=$($deployedUrls['orders-service'])",
    "GIGS_SERVICE_URL=$($deployedUrls['gigs-service'])",
    "PAMPHLET_SERVICE_URL=$($deployedUrls['pamphlet-service'])",
    "PAYMENTS_SERVICE_URL=$($deployedUrls['payments-service'])",
    "PAYOUTS_SERVICE_URL=$($deployedUrls['payouts-service'])",
    "CASH_SERVICE_URL=$($deployedUrls['cash-service'])",
    "CREDIT_SERVICE_URL=$($deployedUrls['credit-service'])",
    "FINANCE_SERVICE_URL=$($deployedUrls['finance-service'])",
    "CONFIG_SERVICE_URL=$($deployedUrls['config-service'])",
    "GOVERNANCE_SERVICE_URL=$($deployedUrls['governance-service'])",
    "SOCIAL_CONNECT_SERVICE_URL=$($deployedUrls['social-connect-service'])"
) -join ","

gcloud run deploy "api-gateway" `
    --image="$Registry/gateway:latest" `
    --region=$Region `
    --project=$ProjectId `
    --platform=managed `
    --port=8080 `
    --ingress=all `
    --allow-unauthenticated `
    --min-instances=$(if ($Env -eq 'prod') { 1 } else { 0 }) `
    --max-instances=20 `
    --memory=512Mi `
    --cpu=1 `
    --set-env-vars="$gatewayEnvVars" `
    --quiet

$gatewayUrl = gcloud run services describe "api-gateway" --region=$Region --project=$ProjectId --format="value(status.url)" 2>$null

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host "            DEPLOYMENT TO GOOGLE CLOUD RUN COMPLETED SUCCESSFULLY!              " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "API Gateway URL:  $gatewayUrl" -ForegroundColor Cyan
Write-Host "Health Check:     $gatewayUrl/health" -ForegroundColor Cyan
Write-Host "Cluster Status:   $gatewayUrl/health/services" -ForegroundColor Cyan
Write-Host "Update web/.env.$Env with: REACT_APP_API_BASE_URL=$gatewayUrl" -ForegroundColor Yellow

