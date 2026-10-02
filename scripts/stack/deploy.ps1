<#
.SYNOPSIS
  Deploy Logikchain stack (Functions, Hosting, Firestore Rules & Indexes, Storage Rules) to a Firebase alias.

.PARAMETER Alias
  dev | test | prod

.PARAMETER Only
  Firebase --only targets. Default: functions,firestore:rules,firestore:indexes,storage,hosting

.PARAMETER Force
  Skip confirmation prompts for test/prod environments.

.PARAMETER CiRecovery
  Backwards-compatible switch for -Force on test/prod environments.

.PARAMETER SkipBuild
  Skip the build step before deploying.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\stack\deploy.ps1 -Alias dev
  .\scripts\stack\deploy.ps1 -Alias dev -Only functions
  .\scripts\stack\deploy.ps1 -Alias dev -Only hosting
  .\scripts\stack\deploy.ps1 -Alias test -Force
  .\scripts\stack\deploy.ps1 -Alias prod -Force
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("dev", "test", "prod")]
  [string]$Alias,

  [string]$Only = "",

  [switch]$Force,

  [switch]$CiRecovery,

  [switch]$SkipBuild,

  [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Set-Location $RepoRoot

function Assert-NoBareDeploy {
  param([string[]]$Args)
  if ($Args -notcontains "--project") {
    throw "Deploy without --project <alias> is forbidden."
  }
}

$projectNames = @{
  "dev"  = "logikchaindevelopment"
  "test" = "logikchain-test"
  "prod" = "logikchain-prod"
}
$projectId = $projectNames[$Alias]

if ([string]::IsNullOrWhiteSpace($Only)) {
  $Only = "functions,firestore:rules,firestore:indexes,storage,hosting"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Logikchain - Deploy Stack ($Alias to $projectId)" -ForegroundColor Cyan
Write-Host " Targets: $Only" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Safety confirmation for production
if ($Alias -eq "prod" -and -not $Force -and -not $CiRecovery) {
  Write-Host " WARNING: You are deploying full stack to PRODUCTION!" -ForegroundColor Red
  Write-Host " Project: $projectId (prod)" -ForegroundColor Yellow
  Write-Host " Targets: $Only" -ForegroundColor Yellow
  $confirm = Read-Host "Type 'yes' to proceed with production deployment"
  if ($confirm -ne "yes") {
    Write-Host "Production deploy aborted." -ForegroundColor Yellow
    exit 0
  }
}

# 1. Build Web App if hosting is in target list
if ($Only -match "hosting" -and -not $SkipBuild) {
  Write-Host "Building Web App for $Alias..." -ForegroundColor Cyan
  & "$PSScriptRoot\..\web\build.ps1" -Alias $Alias
  if ($LASTEXITCODE -ne 0) { throw "Web build failed for $Alias" }

  if (-not (Test-Path "web/dist/index.html")) {
    throw "web/dist/index.html not found after build!"
  }
}

# 2. Build Cloud Functions if functions is in target list
if ($Only -match "functions") {
  $envFile = Join-Path "functions" ".env.$Alias"
  if (Test-Path $envFile) {
    Write-Host "Loading $envFile into process." -ForegroundColor Gray
    Get-Content $envFile | ForEach-Object {
      if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
      $k, $v = $_ -split "=", 2
      Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim().Trim("'").Trim('"')
    }
  }

  if (-not $SkipBuild) {
    Write-Host "Building Cloud Functions..." -ForegroundColor Cyan
    & "$PSScriptRoot\..\functions\build.ps1"
    if ($LASTEXITCODE -ne 0) { throw "Functions build failed" }
  }
}

# 3. Execute Firebase deploy
$deployArgs = @("deploy", "--project", $Alias, "--only", $Only)
if (-not $Interactive) {
  $deployArgs += "--non-interactive"
}
Assert-NoBareDeploy $deployArgs

Write-Host "Executing: firebase $($deployArgs -join ' ')" -ForegroundColor Green
firebase @deployArgs
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
  Write-Host " Successfully deployed to $Alias ($projectId)!" -ForegroundColor Green
} else {
  Write-Host " Deployment failed with exit code $exitCode." -ForegroundColor Red
}

exit $exitCode
