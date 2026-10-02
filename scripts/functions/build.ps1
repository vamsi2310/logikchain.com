<#
.SYNOPSIS
  Build Cloud Functions (TypeScript compilation to functions/lib).

.PARAMETER Clean
  Remove functions/lib before compilation.

.PARAMETER Watch
  Run TypeScript compiler in watch mode.

.PARAMETER CheckOnly
  Run type checking only (no JS emission).

.EXAMPLE
  .\scripts\functions\build.ps1
  .\scripts\functions\build.ps1 -Clean
  .\scripts\functions\build.ps1 -Watch
  .\scripts\functions\build.ps1 -CheckOnly
#>
param(
  [switch]$Clean,
  [switch]$Watch,
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Set-Location $RepoRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Logikchain - Build Cloud Functions" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Push-Location "functions"
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found in functions directory. Installing dependencies..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed in functions" }
  }

  if ($Clean) {
    if (Test-Path "lib") {
      Write-Host "Cleaning previous build output (functions/lib)..." -ForegroundColor Yellow
      Remove-Item -Path "lib" -Recurse -Force -ErrorAction SilentlyContinue
    }
  }

  if ($CheckOnly) {
    Write-Host "Running TypeScript type check (no emit)..." -ForegroundColor Cyan
    npm run lint
    exit $LASTEXITCODE
  }

  if ($Watch) {
    Write-Host "Starting TypeScript compiler in watch mode..." -ForegroundColor Cyan
    npm run build:watch
    exit $LASTEXITCODE
  }

  Write-Host "Compiling TypeScript (tsc)..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Compilation failed in functions" }

  if (-not (Test-Path "lib/index.js")) {
    throw "Build completed but functions/lib/index.js was not found!"
  }

  Write-Host " Cloud Functions build completed successfully -> functions/lib/" -ForegroundColor Green
}
finally {
  Pop-Location
}
