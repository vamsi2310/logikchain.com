<#
.SYNOPSIS
  Deploy Cloud Functions to a specific Firebase alias (dev, test, prod).

.PARAMETER Alias
  Target environment alias: dev | test | prod.

.PARAMETER OnlyFunction
  Optional specific function name or filter (e.g. 'api' or 'placeOrder').

.PARAMETER Force
  Skip interactive confirmation prompt when deploying to prod.

.PARAMETER SkipBuild
  Skip the build step before deploying.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\functions\deploy.ps1 -Alias dev
  .\scripts\functions\deploy.ps1 -Alias test
  .\scripts\functions\deploy.ps1 -Alias prod -Force
  .\scripts\functions\deploy.ps1 -Alias dev -OnlyFunction api
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("dev", "test", "prod")]
  [string]$Alias,

  [string]$OnlyFunction = "",

  [switch]$Force,

  [switch]$SkipBuild,

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
Write-Host " Logikchain - Deploy Cloud Functions ($Alias to $projectId)" -ForegroundColor Cyan
if ($OnlyFunction) {
  Write-Host " Target Filter: $OnlyFunction" -ForegroundColor Cyan
}
Write-Host "==========================================================" -ForegroundColor Cyan

# Safety confirmation for production
if ($Alias -eq "prod" -and -not $Force) {
  Write-Host " WARNING: You are about to deploy Cloud Functions to PRODUCTION!" -ForegroundColor Red
  Write-Host " Project: $projectId (prod)" -ForegroundColor Yellow
  $confirm = Read-Host "Type 'yes' to proceed with production deployment"
  if ($confirm -ne "yes") {
    Write-Host "Deployment aborted by user." -ForegroundColor Yellow
    exit 0
  }
}

# 1. Load env file if available
$envFile = Join-Path "functions" ".env.$Alias"
if (Test-Path $envFile) {
  Write-Host "Loading environment variables from $envFile..." -ForegroundColor Gray
  Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
    $k, $v = $_ -split "=", 2
    Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim().Trim("'").Trim('"')
  }
}

# 2. Build Cloud Functions
if (-not $SkipBuild) {
  Write-Host "Building Cloud Functions..." -ForegroundColor Cyan
  & "$PSScriptRoot\build.ps1"
  if ($LASTEXITCODE -ne 0) { throw "Functions build failed" }
} else {
  Write-Host "Skipping build step (-SkipBuild)." -ForegroundColor Yellow
}

# 3. Determine deploy targets
$target = "functions"
if (-not [string]::IsNullOrWhiteSpace($OnlyFunction)) {
  $target = "functions:$OnlyFunction"
}

# 4. Deploy with Firebase CLI
$deployArgs = @("deploy", "--project", $Alias, "--only", $target)
if (-not $Interactive) {
  $deployArgs += "--non-interactive"
}

Write-Host "Executing: firebase $($deployArgs -join ' ')" -ForegroundColor Green
firebase @deployArgs
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
  Write-Host " Cloud Functions successfully deployed to $Alias ($projectId)!" -ForegroundColor Green
} else {
  Write-Host " Cloud Functions deployment failed with exit code $exitCode." -ForegroundColor Red
}

exit $exitCode
