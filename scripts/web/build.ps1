<#
.SYNOPSIS
  Build the Web App (Vite PWA multi-role entry points) for a specific target environment.

.PARAMETER Alias
  Target environment: dev | test | prod (maps to Vite modes development, test, production). Default is dev.

.PARAMETER Clean
  Remove web/dist before building.

.PARAMETER CheckOnly
  Run TypeScript type check without building (npm run lint).

.EXAMPLE
  .\scripts\web\build.ps1
  .\scripts\web\build.ps1 -Alias test
  .\scripts\web\build.ps1 -Alias prod -Clean
  .\scripts\web\build.ps1 -CheckOnly
#>
param(
  [Parameter(Position = 0)]
  [ValidateSet("dev", "test", "prod")]
  [string]$Alias = "dev",

  [switch]$Clean,

  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Set-Location $RepoRoot

$buildModes = @{
  "dev"  = "build:dev"
  "test" = "build:test"
  "prod" = "build:prod"
}
$buildScript = $buildModes[$Alias]

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Logikchain - Build Web App (Vite PWA)" -ForegroundColor Cyan
Write-Host " Target Alias: $Alias ($buildScript)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Push-Location "web"
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found in web directory. Installing dependencies..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed in web" }
  }

  if ($Clean) {
    if (Test-Path "dist") {
      Write-Host "Cleaning previous build output (web/dist)..." -ForegroundColor Yellow
      Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
    }
  }

  if ($CheckOnly) {
    Write-Host "Running TypeScript type check (web/lint)..." -ForegroundColor Cyan
    npm run lint
    exit $LASTEXITCODE
  }

  Write-Host "Executing: npm run $buildScript..." -ForegroundColor Cyan
  npm run $buildScript
  if ($LASTEXITCODE -ne 0) { throw "npm run $buildScript failed in web" }

  if (-not (Test-Path "dist/index.html")) {
    throw "Build completed but web/dist/index.html was not found!"
  }

  Write-Host " Web App build completed successfully -> web/dist/" -ForegroundColor Green
}
finally {
  Pop-Location
}
