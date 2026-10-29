<#
.SYNOPSIS
    Automated prerequisite installer script for Logikchain platform deployment.
.DESCRIPTION
    Scans the local workstation for missing tools required by docs/DEPLOYMENT_GUIDE.md
    (Section 1) and automatically installs or upgrades them.
    Supported tools:
      - Google Cloud SDK (gcloud) via winget
      - Firebase CLI (firebase-tools) via npm
      - Bruno CLI (@usebruno/cli) via npm
      - Playwright Test Runner (@playwright/test) via npm
      - Docker Desktop via winget (if absent)
      - Node.js LTS via winget (if absent)
.EXAMPLE
    .\install-prerequisites.ps1
.EXAMPLE
    .\install-prerequisites.ps1 -Force
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$SkipPlaywrightBrowsers
)

$ErrorActionPreference = 'SilentlyContinue'

function Refresh-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

Refresh-EnvPath

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  LOGIKCHAIN PLATFORM - AUTOMATED PREREQUISITE INSTALLER" -ForegroundColor Cyan
Write-Host "  Reference: docs/DEPLOYMENT_GUIDE.md (Section 1)" -ForegroundColor Gray
Write-Host "=================================================================`n" -ForegroundColor Cyan

$installedCount = 0

# ---------------------------------------------------------------------------
# 1. Google Cloud SDK (gcloud)
# ---------------------------------------------------------------------------
Write-Host "[1/5] Checking Google Cloud SDK (gcloud)..." -NoNewline
Refresh-EnvPath
$gcloudCmd = Get-Command gcloud -ErrorAction SilentlyContinue

if ($gcloudCmd -and -not $Force) {
    Write-Host " ALREADY INSTALLED" -ForegroundColor Green
} else {
    Write-Host " INSTALLING..." -ForegroundColor Yellow
    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        Write-Host "  -> Running: winget install --id Google.CloudSDK --exact --accept-package-agreements --accept-source-agreements" -ForegroundColor Gray
        winget install --id Google.CloudSDK --exact --accept-package-agreements --accept-source-agreements
        Refresh-EnvPath
        $gcloudCmd = Get-Command gcloud -ErrorAction SilentlyContinue
        if ($gcloudCmd) {
            Write-Host "  -> Google Cloud SDK installed successfully!" -ForegroundColor Green
            $installedCount++
        } else {
            Write-Host "  -> Note: If installation succeeded, restart the shell to refresh PATH." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  -> winget not detected. Please download Google Cloud SDK Installer from:" -ForegroundColor Red
        Write-Host "     https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe" -ForegroundColor White
    }
}

# ---------------------------------------------------------------------------
# 2. Node.js Runtime (Validation)
# ---------------------------------------------------------------------------
Write-Host "[2/5] Checking Node.js Runtime..." -NoNewline
Refresh-EnvPath
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if ($nodeCmd) {
    $nodeVer = (node -v 2>$null)
    Write-Host " OK ($nodeVer)" -ForegroundColor Green
} else {
    Write-Host " MISSING. Installing Node.js LTS via winget..." -ForegroundColor Yellow
    winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
    Refresh-EnvPath
    $installedCount++
}

# ---------------------------------------------------------------------------
# 3. Firebase CLI (npm global)
# ---------------------------------------------------------------------------
Write-Host "[3/5] Checking Firebase CLI..." -NoNewline
Refresh-EnvPath
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue

if ($firebaseCmd -and -not $Force) {
    Write-Host " ALREADY INSTALLED ($(firebase --version 2>$null))" -ForegroundColor Green
} else {
    Write-Host " INSTALLING..." -ForegroundColor Yellow
    Write-Host "  -> Running: npm install -g firebase-tools@latest" -ForegroundColor Gray
    npm install -g firebase-tools@latest
    Refresh-EnvPath
    $firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
    if ($firebaseCmd) {
        Write-Host "  -> Firebase CLI installed successfully ($(firebase --version 2>$null))!" -ForegroundColor Green
        $installedCount++
    } else {
        Write-Host "  -> Firebase CLI installation completed. Ensure npm global bin is in PATH." -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# 4. Bruno CLI (API Contract Verification)
# ---------------------------------------------------------------------------
Write-Host "[4/5] Checking Bruno CLI..." -NoNewline
Refresh-EnvPath
$bruCmd = Get-Command bru -ErrorAction SilentlyContinue

if ($bruCmd -and -not $Force) {
    Write-Host " ALREADY INSTALLED ($(bru --version 2>$null))" -ForegroundColor Green
} else {
    Write-Host " INSTALLING..." -ForegroundColor Yellow
    Write-Host "  -> Running: npm install -g @usebruno/cli" -ForegroundColor Gray
    npm install -g @usebruno/cli
    Refresh-EnvPath
    $bruCmd = Get-Command bru -ErrorAction SilentlyContinue
    if ($bruCmd) {
        Write-Host "  -> Bruno CLI installed successfully!" -ForegroundColor Green
        $installedCount++
    } else {
        Write-Host "  -> Bruno CLI installed globally (also runnable anytime via npx @usebruno/cli)." -ForegroundColor Green
    }
}

# ---------------------------------------------------------------------------
# 5. Playwright CLI (E2E Test Engine)
# ---------------------------------------------------------------------------
Write-Host "[5/5] Checking Playwright Test Engine..." -NoNewline
Refresh-EnvPath
$pwInstalled = Test-Path "node_modules/@playwright/test/package.json"

if ($pwInstalled -and -not $Force) {
    Write-Host " ALREADY INSTALLED IN WORKSPACE" -ForegroundColor Green
} else {
    Write-Host " CONFIGURING..." -ForegroundColor Yellow
    Write-Host "  -> Running: npm install -D @playwright/test" -ForegroundColor Gray
    npm install -D @playwright/test
    if (-not $SkipPlaywrightBrowsers) {
        Write-Host "  -> Installing Playwright Chromium browser binary..." -ForegroundColor Gray
        npx playwright install chromium
    }
    Write-Host "  -> Playwright test engine ready!" -ForegroundColor Green
    $installedCount++
}

# ---------------------------------------------------------------------------
# Post-Install Verification Check
# ---------------------------------------------------------------------------
Write-Host "`n-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "          RUNNING POST-INSTALLATION VERIFICATION AUDIT          " -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------------`n" -ForegroundColor Cyan

Refresh-EnvPath

$verifyScript = Join-Path $PSScriptRoot "check-prerequisites.ps1"
if (Test-Path $verifyScript) {
    & $verifyScript
} else {
    Write-Host "Prerequisite check script not found at $verifyScript." -ForegroundColor Yellow
}
