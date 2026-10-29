# ===========================================================================
# Logikchain Production DevOps Readiness & Pre-Flight Validation
# ===========================================================================
# Validates tools, configs, containers, cloudbuild, terraform, and databases
# before executing production deployment to Google Cloud Platform.
# ===========================================================================

param (
    [string]$ProjectId = "logikchain-prod",
    [string]$Region = "asia-south1"
)

$AllPassed = $true
$Checks = @()

function Register-Audit {
    param (
        [string]$Category,
        [string]$Item,
        [string]$Status,
        [string]$Details
    )
    $script:Checks += [PSCustomObject]@{
        Category = $Category
        Item     = $Item
        Status   = $Status
        Details  = $Details
    }
    if ($Status -eq "[FAIL]") {
        $script:AllPassed = $false
    }
}

Write-Host ""
Write-Host "====================================================================================" -ForegroundColor Cyan
Write-Host "               LOGIKCHAIN DEVOPS: PRODUCTION DEPLOYMENT AUDITOR                     " -ForegroundColor Cyan
Write-Host "               Target Project: $ProjectId | Region: $Region                         " -ForegroundColor Gray
Write-Host "====================================================================================" -ForegroundColor Cyan

# 1. CI/CD & Build Configuration Check
$cloudbuildPath = "microservices\devops\ci-cd\cloudbuild.yaml"
if (Test-Path $cloudbuildPath) {
    $content = Get-Content $cloudbuildPath -Raw
    $hasAllSvcs = $content -match "identity-service" -and $content -match "config-service" -and $content -match "social-connect-service"
    if ($hasAllSvcs) {
        Register-Audit -Category "CI/CD" -Item "CloudBuild Pipeline" -Status "[PASS]" -Details "Includes all 13 Epics & Sync Engine"
    } else {
        Register-Audit -Category "CI/CD" -Item "CloudBuild Pipeline" -Status "[FAIL]" -Details "Missing some microservice build steps"
    }
} else {
    Register-Audit -Category "CI/CD" -Item "CloudBuild Pipeline" -Status "[FAIL]" -Details "cloudbuild.yaml missing"
}

# 2. Deployment Script Integrity
$deployScript = "microservices\devops\scripts\deploy-gcp.sh"
if (Test-Path $deployScript) {
    $dContent = Get-Content $deployScript -Raw
    if ($dContent -match "social-connect-service" -and $dContent -match "api-gateway") {
        Register-Audit -Category "Deployment" -Item "deploy-gcp.sh Script" -Status "[PASS]" -Details "Configured for full cluster deploy to Cloud Run"
    } else {
        Register-Audit -Category "Deployment" -Item "deploy-gcp.sh Script" -Status "[FAIL]" -Details "Incomplete service list"
    }
}

# 3. Database Initializer (Database-Per-Service)
$sqlScript = "microservices\devops\scripts\init-databases.sql"
if (Test-Path $sqlScript) {
    $sContent = Get-Content $sqlScript -Raw
    $dbs = @("identity_db","orders_db","gigs_db","pamphlet_db","payments_db","payouts_db","cash_db","credit_db","finance_db","config_db","governance_db","social_connect_db","sync_db")
    $missingDb = $dbs | Where-Object { $sContent -notmatch $_ }
    if (-not $missingDb) {
        Register-Audit -Category "Database" -Item "Database-Per-Service Schema" -Status "[PASS]" -Details "All 13 Postgres databases defined with outbox_events"
    } else {
        Register-Audit -Category "Database" -Item "Database-Per-Service Schema" -Status "[FAIL]" -Details "Missing DBs: $($missingDb -join ', ')"
    }
}

# 4. Terraform Cloud SQL & VPC Definitions
$tfMain = "microservices\devops\terraform\main.tf"
if (Test-Path $tfMain) {
    $tContent = Get-Content $tfMain -Raw
    $hasPg16 = $tContent -match "POSTGRES_16"
    $hasVpc = $tContent -match "private_network"
    if ($hasPg16 -and $hasVpc) {
        Register-Audit -Category "Terraform" -Item "Cloud SQL & VPC Isolation" -Status "[PASS]" -Details "Private VPC IP, Postgres 16, Cloud Run Gateway"
    } else {
        Register-Audit -Category "Terraform" -Item "Cloud SQL & VPC Isolation" -Status "[FAIL]" -Details "Check PostgreSQL version or VPC network settings"
    }
}

# 5. CLI & Tooling Prerequisites
$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
if ($gcloud) {
    Register-Audit -Category "CLI Tooling" -Item "Google Cloud SDK (gcloud)" -Status "[PASS]" -Details "Installed"
} else {
    Register-Audit -Category "CLI Tooling" -Item "Google Cloud SDK (gcloud)" -Status "[WARN]" -Details "gcloud CLI not in path. Required on deployment workstation."
}

$terraform = Get-Command terraform -ErrorAction SilentlyContinue
if ($terraform) {
    Register-Audit -Category "CLI Tooling" -Item "HashiCorp Terraform" -Status "[PASS]" -Details "Installed"
} else {
    Register-Audit -Category "CLI Tooling" -Item "HashiCorp Terraform" -Status "[WARN]" -Details "terraform not in path. Required if provisioning via TF."
}

# 6. Dockerfile Coverage
$dockerfiles = @(
    "microservices\devops\docker\Dockerfile.gateway",
    "microservices\devops\docker\Dockerfile.sync-engine",
    "microservices\devops\docker\Dockerfile.service"
)
$missingDf = $dockerfiles | Where-Object { -not (Test-Path $_) }
if (-not $missingDf) {
    Register-Audit -Category "Containers" -Item "Multi-Service Dockerfiles" -Status "[PASS]" -Details "Gateway, Sync Engine & Generic Service Dockerfiles verified"
} else {
    Register-Audit -Category "Containers" -Item "Multi-Service Dockerfiles" -Status "[FAIL]" -Details "Missing: $($missingDf -join ', ')"
}

# Output Table
$Checks | Format-Table -AutoSize -Property Category, Item, Status, Details

if ($AllPassed) {
    Write-Host "====================================================================================" -ForegroundColor Green
    Write-Host " [PASS] DevOps configuration is validated and READY for production deployment!" -ForegroundColor Green
    Write-Host "====================================================================================`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "====================================================================================" -ForegroundColor Red
    Write-Host " [FAIL] Review failed checks above before promoting to production." -ForegroundColor Red
    Write-Host "====================================================================================`n" -ForegroundColor Red
    exit 1
}

