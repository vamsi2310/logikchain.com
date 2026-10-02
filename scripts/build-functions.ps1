<#
.SYNOPSIS
  Build Cloud Functions (TypeScript compilation to functions/lib).

.PARAMETER Clean
  Remove previous build output (functions/lib) before compiling.

.PARAMETER Watch
  Run TypeScript compiler in watch mode (continuous incremental rebuilds).

.PARAMETER CheckOnly
  Type-check TypeScript source without emitting JavaScript (tsc --noEmit).

.EXAMPLE
  .\scripts\build-functions.ps1
  .\scripts\build-functions.ps1 -Clean
  .\scripts\build-functions.ps1 -Watch
  .\scripts\build-functions.ps1 -CheckOnly
#>
param(
  [switch]$Clean,
  [switch]$Watch,
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Logikchain - Build Cloud Functions" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$functionsDir = Join-Path $RepoRoot "functions"
$libDir = Join-Path $functionsDir "lib"

# 1. Ensure dependencies are installed
Push-Location $functionsDir
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found in functions directory. Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed in functions" }
  }

  # 2. Clean previous build if requested
  if ($Clean) {
    if (Test-Path $libDir) {
      Write-Host "Cleaning previous build output ($libDir)..." -ForegroundColor Gray
      Remove-Item -Recurse -Force $libDir
    }
  }

  # 3. Execute build or watch or check
  if ($CheckOnly) {
    Write-Host "Running TypeScript type check (no emit)..." -ForegroundColor Cyan
    npm run lint
    if ($LASTEXITCODE -ne 0) { throw "Type checking failed with errors." }
    Write-Host " Type check completed successfully!" -ForegroundColor Green
    return
  }

  if ($Watch) {
    Write-Host "Starting TypeScript compiler in watch mode..." -ForegroundColor Cyan
    npm run build:watch
    return
  }

  Write-Host "Compiling TypeScript (tsc)..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed with errors." }

  # Verify output exists
  $entryFile = Join-Path $libDir "index.js"
  if (-not (Test-Path $entryFile)) {
    throw "Build completed but entry file '$entryFile' was not found."
  }

  Write-Host " Functions build completed successfully -> functions/lib/" -ForegroundColor Green
}
finally {
  Pop-Location
}
