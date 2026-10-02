<#
.SYNOPSIS
  Deploy Logikchain to a Firebase alias. Always passes --project <alias>.

.PARAMETER Alias
  dev | test | prod   (emulator starts local emulators; it does not deploy)

.PARAMETER Only
  Firebase --only targets. Default: functions,firestore:rules,firestore:indexes,storage,hosting

.PARAMETER Force
  Skip confirmation prompts for test/prod environments.

.PARAMETER CiRecovery
  Backwards-compatible switch for -Force on test/prod environments.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\deploy.ps1 -Alias dev
  .\scripts\deploy.ps1 -Alias dev -Only functions
  .\scripts\deploy.ps1 -Alias dev -Only hosting
  .\scripts\deploy.ps1 -Alias test -Force
  .\scripts\deploy.ps1 -Alias prod -Force
  .\scripts\deploy.ps1 -Alias emulator
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("emulator", "dev", "test", "prod")]
  [string]$Alias,

  [string]$Only = "",

  [switch]$Force,

  [switch]$CiRecovery,

  [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Assert-NoBareDeploy {
  param([string[]]$Args)
  if ($Args -notcontains "--project") {
    throw "Deploy without --project <alias> is forbidden."
  }
}

if ($Alias -eq "emulator") {
  Write-Host "Starting emulator playbook (no firebase deploy)." -ForegroundColor Cyan
  Push-Location functions
  if (-not (Test-Path node_modules)) { npm install }
  npm run build
  Pop-Location
  firebase emulators:start --only auth,firestore,functions,storage,pubsub
  exit $LASTEXITCODE
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
Write-Host " Logikchain - Deploy ($Alias to $projectId)" -ForegroundColor Cyan
Write-Host " Targets: $Only" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Safety confirmation for production
if ($Alias -eq "prod" -and -not $Force -and -not $CiRecovery) {
  Write-Host " WARNING: You are deploying to PRODUCTION!" -ForegroundColor Red
  Write-Host " Project: $projectId (prod)" -ForegroundColor Yellow
  Write-Host " Targets: $Only" -ForegroundColor Yellow
  $confirm = Read-Host "Type 'yes' to proceed with production deployment"
  if ($confirm -ne "yes") {
    Write-Host "Production deploy aborted." -ForegroundColor Yellow
    exit 0
  }
}

# 1. Build Web App if hosting is in target list
if ($Only -match "hosting") {
  Write-Host "Building Web App for $Alias..." -ForegroundColor Cyan
  Push-Location web
  try {
    if (-not (Test-Path "node_modules")) {
      Write-Host "Installing web dependencies..." -ForegroundColor Gray
      npm install
      if ($LASTEXITCODE -ne 0) { throw "npm install failed in web" }
    }
    $webBuildScript = switch ($Alias) {
      "dev"  { "build:dev" }
      "test" { "build:test" }
      "prod" { "build:prod" }
      default { "build:dev" }
    }
    npm run $webBuildScript
    if ($LASTEXITCODE -ne 0) { throw "npm run $webBuildScript failed in web" }
  }
  finally {
    Pop-Location
  }

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

  Write-Host "Building Cloud Functions..." -ForegroundColor Cyan
  Push-Location functions
  try {
    if (-not (Test-Path "node_modules")) {
      Write-Host "Installing functions dependencies..." -ForegroundColor Gray
      npm install
      if ($LASTEXITCODE -ne 0) { throw "npm install failed in functions" }
    }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed in functions" }
  }
  finally {
    Pop-Location
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
