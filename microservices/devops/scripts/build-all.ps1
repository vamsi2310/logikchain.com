<#
.SYNOPSIS
    Builds all Logikchain microservices containers:
    - Gateway (Node.js Express :8080)
    - Firebase Bridge (Node.js + Firebase Admin :4050)
    - All 12 Domain Microservices (Rust Axum + SQLite WAL :4001-:4012)
#>
param(
    [string[]]$Services = @(
        'identity-service',
        'orders-service',
        'gigs-service',
        'pamphlet-service',
        'payments-service',
        'payouts-service',
        'cash-service',
        'credit-service',
        'finance-service',
        'config-service',
        'governance-service',
        'social-connect-service'
    ),
    [switch]$SkipGateway,
    [switch]$SkipBridge,
    [switch]$DeployToK8s
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Resolve-Path "$ScriptDir\..\.."

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "               BUILDING LOGIKCHAIN CONTAINER SUITE                              " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

Set-Location $RootDir

# 1. Build Gateway
if (-not $SkipGateway) {
    Write-Host "`n[1/3] Building API Gateway (logikchain/gateway:latest)..." -ForegroundColor Yellow
    docker build -t logikchain/gateway:latest -f devops/docker/Dockerfile.gateway .
}

# 2. Build Firebase Bridge
if (-not $SkipBridge) {
    Write-Host "`n[2/3] Building Firebase Bridge (logikchain/firebase-bridge:latest)..." -ForegroundColor Yellow
    docker build -t logikchain/firebase-bridge:latest -f devops/docker/Dockerfile.firebase-bridge .
}

# 3. Build Rust Microservices
Write-Host "`n[3/3] Building Rust Axum Microservices with embedded SQLite..." -ForegroundColor Yellow

foreach ($svc in $Services) {
    Write-Host "  -> Building logikchain/${svc}-rust:latest (SERVICE_NAME=$svc)..." -ForegroundColor Cyan
    docker build -f rust-services/Dockerfile.rust-service `
        -t "logikchain/${svc}-rust:latest" `
        --build-arg "SERVICE_NAME=$svc" `
        rust-services
}

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host "       All container images built successfully and available in Docker daemon!   " -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green

if ($DeployToK8s) {
    Write-Host "`nDeploying to local Kubernetes namespace 'logikchain-backend'..." -ForegroundColor Cyan
    kubectl apply -f devops\k8s\local\03-all-services-local.yaml
    kubectl rollout status deployment/orders-service -n logikchain-backend --timeout=60s
    kubectl get pods -n logikchain-backend
}

