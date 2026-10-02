<#
.SYNOPSIS
  Run Logikchain Bruno API test collection.

.PARAMETER Env
  Target environment: 'dev' (Firebase Cloud Dev) or 'emulator' (Local). Default is 'dev'.

.PARAMETER Group
  Run a specific group folder (e.g., '01-identity', '03-orders', '11-config').

.PARAMETER Api
  Run a single API operation folder (e.g., '03-orders/placeOrder', '01-identity/createSupplier').

.PARAMETER Smoke
  Run only tests tagged with 'smoke' (read-only, fixture-safe tests).

.PARAMETER All
  Include all tests without excluding 'webhook' and 'manual' tags.

.PARAMETER Token
  Provide an active Firebase ID token (JWT) to use for authenticated requests.

.PARAMETER AppCheckToken
  Provide an App Check token for environments enforcing App Check.

.EXAMPLE
  # Run smoke tests on Dev Cloud
  .\scripts\tools\run-bruno-tests.ps1 -Smoke

  # Run config tests on Dev Cloud
  .\scripts\tools\run-bruno-tests.ps1 -Group 11-config

  # Run all non-webhook tests on Dev Cloud
  .\scripts\tools\run-bruno-tests.ps1

  # Run with a specific auth ID token
  .\scripts\tools\run-bruno-tests.ps1 -Token "eyJhbGciOi..."

  # Run tests against local emulator
  .\scripts\tools\run-bruno-tests.ps1 -Env emulator
#>
param(
  [ValidateSet("dev", "emulator")]
  [string]$Env = "dev",

  [string]$Group,

  [string]$Api,

  [switch]$Smoke,

  [switch]$All,

  [string]$Token,

  [string]$AppCheckToken
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$BrunoDir = Join-Path $RepoRoot "tests\bruno"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Logikchain - Bruno API Test Runner" -ForegroundColor Cyan
Write-Host " Target Environment: $Env" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure Bruno CLI is available
Push-Location $BrunoDir
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Bruno test dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to install dependencies in tests/bruno."
    }
  }

  # 2. Check for dev.local.bru if running against Dev
  if ($Env -eq "dev") {
    $localBru = Join-Path $BrunoDir "environments\dev.local.bru"
    if (-not (Test-Path $localBru)) {
      Write-Host ""
      Write-Host "[INFO] No 'dev.local.bru' found." -ForegroundColor Yellow
      Write-Host "       If tests fail with 401 UNAUTHENTICATED, configure test credentials in:" -ForegroundColor DarkGray
      Write-Host "       tests\bruno\environments\dev.local.bru (from dev.local.bru.example)" -ForegroundColor DarkGray
      Write-Host "       Or pass -Token <FirebaseIdToken> to this script." -ForegroundColor DarkGray
      Write-Host ""
    }
  }

  # 3. Export environment variables if provided as parameters
  if ($Token) {
    $env:accessToken = $Token
    Write-Host "[AUTH] Using provided ID token override." -ForegroundColor Green
  }
  if ($AppCheckToken) {
    $env:appCheckToken = $AppCheckToken
    Write-Host "[SECURITY] Using provided App Check token override." -ForegroundColor Green
  }

  # 4. Construct Bruno CLI arguments
  $cliArgs = @("run")

  if ($Api) {
    $cliArgs += $Api
  } elseif ($Group) {
    $cliArgs += $Group
  }

  $cliArgs += @("--env", $Env)

  if ($Smoke) {
    $cliArgs += @("--tags", "smoke")
  } elseif (-not $All) {
    $cliArgs += @("--exclude-tags", "webhook,manual")
  }

  Write-Host "Executing: npx bru $($cliArgs -join ' ')" -ForegroundColor Cyan
  Write-Host ""

  & npx bru @cliArgs

  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Tests finished with failures (Exit code: $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
  } else {
    Write-Host ""
    Write-Host "All specified tests passed successfully!" -ForegroundColor Green
  }
}
finally {
  # Clean up env overrides from current process
  if ($Token) { Remove-Item Env:\accessToken -ErrorAction SilentlyContinue }
  if ($AppCheckToken) { Remove-Item Env:\appCheckToken -ErrorAction SilentlyContinue }
  Pop-Location
}
