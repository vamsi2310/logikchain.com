# ==============================================================================
# Automated Local Kubernetes Environment Setup for Logikchain
# ==============================================================================
param (
    [switch]$BuildImages,
    [switch]$Teardown
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "            LOGIKCHAIN LOCAL KUBERNETES ENVIRONMENT PROVISIONER                  " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# 1. Verify Docker Engine is running
Write-Host "[1/5] Checking Docker Engine..." -NoNewline
try {
    $dockerVer = docker version --format '{{.Server.Version}}' 2>$null
    if (-not $dockerVer) { throw "Docker not responsive" }
    Write-Host " OK ($dockerVer)" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "Error: Docker daemon is not running. Please start Docker Desktop and retry." -ForegroundColor Yellow
    exit 1
}

# 2. Verify Kubernetes cluster readiness
Write-Host "[2/5] Checking Kubernetes cluster connectivity..." -NoNewline
$k8sOk = $false
try {
    $null = kubectl cluster-info --request-timeout=3s 2>&1
    if ($LASTEXITCODE -eq 0) {
        $k8sOk = $true
        Write-Host " CONNECTED" -ForegroundColor Green
    }
} catch {
    $k8sOk = $false
}

if (-not $k8sOk) {
    Write-Host " NOT DETECTED" -ForegroundColor Yellow
    Write-Host "`nDocker Desktop Kubernetes is currently disabled on this machine." -ForegroundColor Yellow
    Write-Host "To enable it:" -ForegroundColor Cyan
    Write-Host "  1. Open Docker Desktop"
    Write-Host "  2. Go to Settings (gear icon) -> Kubernetes"
    Write-Host "  3. Check 'Enable Kubernetes' -> Click 'Apply & restart'"
    Write-Host "  4. Wait ~2 minutes for the green Kubernetes status indicator in Docker Desktop"
    Write-Host "  5. Re-run: .\microservices\devops\scripts\setup-local-k8s.ps1`n"
    
    # Fallback to local docker-compose cluster
    Write-Host "Alternatively, would you like to run the microservices via local Docker Compose?" -ForegroundColor Cyan
    Write-Host "Run: docker compose -f microservices\docker-compose.yml up -d" -ForegroundColor White
    exit 0
}

# 3. Teardown if requested
if ($Teardown) {
    Write-Host "`n[Teardown] Removing logikchain-backend namespace and resources..." -ForegroundColor Yellow
    kubectl delete namespace logikchain-backend --ignore-not-found=true
    Write-Host "Teardown complete." -ForegroundColor Green
    exit 0
}

# 4. Optional Image Builds
if ($BuildImages) {
    Write-Host "`n[3/5] Building Docker images locally for Kubernetes..." -ForegroundColor Cyan
    & .\microservices\devops\scripts\build-all.sh
} else {
    Write-Host "[3/5] Skipping image builds (pass -BuildImages to build fresh containers)" -ForegroundColor Gray
}

# 5. Apply Local Kubernetes Manifests
Write-Host "`n[4/5] Applying Kubernetes manifests to local cluster..." -ForegroundColor Cyan

kubectl apply -f microservices\devops\k8s\00-namespace.yaml
kubectl apply -f microservices\devops\k8s\local\00-postgres-local.yaml
kubectl apply -f microservices\devops\k8s\local\01-configmaps-secrets.yaml
kubectl apply -f microservices\devops\k8s\local\02-gateway-local.yaml
kubectl apply -f microservices\devops\k8s\local\03-all-services-local.yaml

Write-Host "Manifests successfully applied!" -ForegroundColor Green

# 6. Status verification
Write-Host "`n[5/5] Checking rollout status in 'logikchain-backend'..." -ForegroundColor Cyan
kubectl get pods -n logikchain-backend -o wide
Write-Host "`nLocal Kubernetes cluster is ready!" -ForegroundColor Green
Write-Host "Gateway NodePort exposed at: http://localhost:30080" -ForegroundColor Cyan
Write-Host "Run 'kubectl get pods -n logikchain-backend -w' to watch pod startup." -ForegroundColor Gray

