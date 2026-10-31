<#
.SYNOPSIS
    Builds Docker containers for specified microservices and deploys them to local Kubernetes cluster.
.PARAMETER Services
    Array of service names to build and deploy. Defaults to @('identity-service', 'social-connect-service').
#>
param(
    [string[]]$Services = @('identity-service', 'social-connect-service')
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
    Write-Host "`n[1/3] Building TypeScript for $svc..." -ForegroundColor Yellow
    npm --prefix "services/$svc" run build

    Write-Host "[2/3] Building Docker container: logikchain/${svc}:latest..." -ForegroundColor Yellow
    docker build -t "logikchain/${svc}:latest" --build-arg "SERVICE_NAME=$svc" -f "devops/docker/Dockerfile.service" .

    Write-Host "[3/3] Rolling out to Kubernetes namespace: logikchain-backend..." -ForegroundColor Yellow
    kubectl rollout restart "deployment/$svc" -n logikchain-backend
    kubectl rollout status "deployment/$svc" -n logikchain-backend --timeout=60s
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " Verifying Cluster Health Status" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

kubectl get pods -n logikchain-backend -l "app in ($($Services -join ','))"

Write-Host "`nAll specified services successfully built and deployed on Kubernetes!" -ForegroundColor Green
