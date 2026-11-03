<#
.SYNOPSIS
    Builds Docker containers for specified microservices and deploys them to local Kubernetes cluster.
.PARAMETER Services
    Array of service names to build and deploy. Defaults to @('orders-service').
#>
param(
    [string[]]$Services = @('orders-service')
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Resolve-Path "$ScriptDir\..\.."

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Building & Deploying Services on Kubernetes" -ForegroundColor Cyan
Write-Host " Root Directory: $RootDir" -ForegroundColor Gray
Write-Host " Target Services: $($Services -join ', ')" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location $RootDir

foreach ($svc in $Services) {
    if ($svc -eq 'gateway') {
        Write-Host "`nBuilding API Gateway: logikchain/gateway:latest..." -ForegroundColor Yellow
        docker build -t logikchain/gateway:latest -f devops/docker/Dockerfile.gateway .
    }
    elseif ($svc -eq 'firebase-bridge') {
        Write-Host "`nBuilding Firebase Bridge: logikchain/firebase-bridge:latest..." -ForegroundColor Yellow
        docker build -t logikchain/firebase-bridge:latest -f devops/docker/Dockerfile.firebase-bridge .
    }
    else {
        # Domain Microservice in Rust
        Write-Host "`nBuilding Rust container: logikchain/${svc}-rust:latest (SERVICE_NAME=$svc)..." -ForegroundColor Yellow
        docker build -f rust-services/Dockerfile.rust-service `
            -t "logikchain/${svc}-rust:latest" `
            --build-arg "SERVICE_NAME=$svc" `
            rust-services
    }

    Write-Host "Rolling out to Kubernetes namespace: logikchain-backend..." -ForegroundColor Yellow
    kubectl rollout restart "deployment/$svc" -n logikchain-backend
    kubectl rollout status "deployment/$svc" -n logikchain-backend --timeout=60s
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " Verifying Cluster Health Status" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

kubectl get pods -n logikchain-backend -l "app in ($($Services -join ','))"

Write-Host "`nAll specified services successfully built and deployed on Kubernetes!" -ForegroundColor Green
