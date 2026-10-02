<#
.SYNOPSIS
  Build and Deploy the Web App (Hosting) to a specific Firebase alias (dev, test, prod).

.PARAMETER Alias
  Target environment alias: dev | test | prod.

.PARAMETER SkipBuild
  Skip the build step and deploy the current web/dist directly.

.PARAMETER Force
  Skip interactive confirmation prompt when deploying to prod.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\web\deploy.ps1 -Alias dev
  .\scripts\web\deploy.ps1 -Alias test
  .\scripts\web\deploy.ps1 -Alias prod -Force
  .\scripts\web\deploy.ps1 -Alias dev -SkipBuild
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("dev", "test", "prod")]
  [string]$Alias,

  [switch]$SkipBuild,

  [switch]$Force,

  [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Set-Location $RepoRoot

$projectNames = @{
  "dev"  = "logikchaindevelopment"
  "test" = "logikchain-test"
  "prod" = "logikchain-prod"
}
$projectId = $projectNames[$Alias]

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Logikchain - Deploy Web App (Hosting) ($Alias to $projectId)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Safety confirmation for production
if ($Alias -eq "prod" -and -not $Force) {
  Write-Host " WARNING: You are about to deploy the Web App to PRODUCTION!" -ForegroundColor Red
  Write-Host " Project: $projectId (prod)" -ForegroundColor Yellow
  $confirm = Read-Host "Type 'yes' to proceed with production deployment"
  if ($confirm -ne "yes") {
    Write-Host "Deployment aborted by user." -ForegroundColor Yellow
    exit 0
  }
}

# 1. Build the Web App for the target environment
if (-not $SkipBuild) {
  Write-Host "Building Web App for $Alias..." -ForegroundColor Cyan
  & "$PSScriptRoot\build.ps1" -Alias $Alias
  if ($LASTEXITCODE -ne 0) { throw "Web build failed for $Alias" }
} else {
  Write-Host "Skipping build step as requested (-SkipBuild)." -ForegroundColor Yellow
}

# Verify web/dist exists
if (-not (Test-Path "web/dist/index.html")) {
  throw "web/dist/index.html not found! Ensure build succeeds before deploying hosting."
}

# 2. Deploy hosting with Firebase CLI
$deployArgs = @("deploy", "--project", $Alias, "--only", "hosting")
if (-not $Interactive) {
  $deployArgs += "--non-interactive"
}

Write-Host "Executing: firebase $($deployArgs -join ' ')" -ForegroundColor Green
firebase @deployArgs
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
  Write-Host " Web App successfully deployed to $Alias ($projectId)!" -ForegroundColor Green
} else {
  Write-Host " Web App deployment failed with exit code $exitCode." -ForegroundColor Red
}

exit $exitCode
