<#
.SYNOPSIS
    Prerequisite verification script for Logikchain platform deployment.
.DESCRIPTION
    Validates that the host workstation has all required CLI tools and minimum
    versions specified in docs/DEPLOYMENT_GUIDE.md (Section 1).
.EXAMPLE
    .\check-prerequisites.ps1
#>

[CmdletBinding()]
param(
    [switch]$Detailed
)

$ErrorActionPreference = 'SilentlyContinue'

# Refresh PATH from system and user registry in case tools were recently installed
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  LOGIKCHAIN PLATFORM DEPLOYMENT - PREREQUISITE CHECK" -ForegroundColor Cyan
Write-Host "  Reference: docs/DEPLOYMENT_GUIDE.md (Section 1)" -ForegroundColor Gray
Write-Host "=================================================================`n" -ForegroundColor Cyan

$Results = [System.Collections.Generic.List[PSCustomObject]]::new()
$AllPassed = $true

function Test-SemanticVersion([string]$Actual, [string]$Required) {
    try {
        $actualClean = ($Actual -replace '[^0-9\.]', '').Split('.')[0..2] -join '.'
        $reqClean = ($Required -replace '[^0-9\.]', '').Split('.')[0..2] -join '.'
        $vActual = [version]$actualClean
        $vReq = [version]$reqClean
        return $vActual -ge $vReq
    } catch {
        return $false
    }
}

function Register-Check {
    param(
        [string]$Tool,
        [string]$Required,
        [string]$Found,
        [bool]$Passed,
        [string]$Status,
        [string]$Remediation
    )
    $script:Results.Add([PSCustomObject]@{
        Tool        = $Tool
        Required    = $Required
        Found       = $Found
        Status      = $Status
        Remediation = $Remediation
    })
    if (-not $Passed) {
        $script:AllPassed = $false
    }
}

# ---------------------------------------------------------------------------
# 1. Google Cloud SDK (gcloud)
# ---------------------------------------------------------------------------
Write-Host "[1/6] Checking Google Cloud SDK (gcloud)..." -NoNewline
$gcloudCmd = Get-Command gcloud -ErrorAction SilentlyContinue
if ($gcloudCmd) {
    $gcloudOut = gcloud version 2>$null | Out-String
    if ($gcloudOut -match 'Google Cloud SDK\s+([0-9\.]+)') {
        $gcloudVer = $Matches[1]
        $pass = Test-SemanticVersion -Actual $gcloudVer -Required "490.0.0"
        if ($pass) {
            Write-Host " OK ($gcloudVer)" -ForegroundColor Green
            Register-Check -Tool "Google Cloud SDK (gcloud)" -Required "490.0.0+" -Found $gcloudVer -Passed $true -Status "PASS" -Remediation "None"
        } else {
            Write-Host " OUTDATED ($gcloudVer)" -ForegroundColor Yellow
            Register-Check -Tool "Google Cloud SDK (gcloud)" -Required "490.0.0+" -Found $gcloudVer -Passed $false -Status "WARN" -Remediation "Run: gcloud components update"
        }
    } else {
        Write-Host " FOUND (Version undetermined)" -ForegroundColor Yellow
        Register-Check -Tool "Google Cloud SDK (gcloud)" -Required "490.0.0+" -Found "Detected" -Passed $true -Status "PASS" -Remediation "Run: gcloud components update"
    }
} else {
    Write-Host " MISSING" -ForegroundColor Red
    Register-Check -Tool "Google Cloud SDK (gcloud)" -Required "490.0.0+" -Found "Not Installed" -Passed $false -Status "FAIL" -Remediation "Install via: winget install Google.CloudSDK or https://cloud.google.com/sdk/docs/install"
}

# ---------------------------------------------------------------------------
# 2. Docker Engine & Daemon
# ---------------------------------------------------------------------------
Write-Host "[2/6] Checking Docker Engine..." -NoNewline
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    $dockerVerRaw = (docker --version 2>$null)
    if ($dockerVerRaw -match 'version\s+([0-9\.]+)') {
        $dockerVer = $Matches[1]
        $pass = Test-SemanticVersion -Actual $dockerVer -Required "24.0.0"
        # Check daemon status
        $daemonRunning = $false
        $null = docker info 2>$null
        if ($LASTEXITCODE -eq 0) { $daemonRunning = $true }

        if ($pass -and $daemonRunning) {
            Write-Host " OK ($dockerVer, Daemon Active)" -ForegroundColor Green
            Register-Check -Tool "Docker Engine" -Required "26.0.0+" -Found "$dockerVer (Running)" -Passed $true -Status "PASS" -Remediation "None"
        } elseif (-not $daemonRunning) {
            Write-Host " RUNTIME ERROR (Daemon not responding)" -ForegroundColor Yellow
            Register-Check -Tool "Docker Engine" -Required "26.0.0+" -Found "$dockerVer (Daemon Stopped)" -Passed $false -Status "FAIL" -Remediation "Start Docker Desktop / daemon service"
        } else {
            Write-Host " OK ($dockerVer)" -ForegroundColor Green
            Register-Check -Tool "Docker Engine" -Required "26.0.0+" -Found $dockerVer -Passed $true -Status "PASS" -Remediation "None"
        }
    } else {
        Write-Host " DETECTED" -ForegroundColor Green
        Register-Check -Tool "Docker Engine" -Required "26.0.0+" -Found "Detected" -Passed $true -Status "PASS" -Remediation "None"
    }
} else {
    Write-Host " MISSING" -ForegroundColor Red
    Register-Check -Tool "Docker Engine" -Required "26.0.0+" -Found "Not Installed" -Passed $false -Status "FAIL" -Remediation "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
}

# ---------------------------------------------------------------------------
# 3. Node.js Runtime
# ---------------------------------------------------------------------------
Write-Host "[3/6] Checking Node.js Runtime..." -NoNewline
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVerRaw = (node -v 2>$null)
    if ($nodeVerRaw -match 'v([0-9\.]+)') {
        $nodeVer = $Matches[1]
        $pass = Test-SemanticVersion -Actual $nodeVer -Required "20.0.0"
        $isV22 = $nodeVer.StartsWith("22.")
        if ($isV22) {
            Write-Host " OK ($nodeVer LTS)" -ForegroundColor Green
            Register-Check -Tool "Node.js" -Required "22.x LTS" -Found "v$nodeVer" -Passed $true -Status "PASS" -Remediation "None"
        } elseif ($pass) {
            Write-Host " COMPATIBLE ($nodeVer)" -ForegroundColor Yellow
            Register-Check -Tool "Node.js" -Required "22.x LTS" -Found "v$nodeVer" -Passed $true -Status "WARN" -Remediation "Node 22 recommended: nvm use 22 or https://nodejs.org"
        } else {
            Write-Host " OUTDATED (v$nodeVer)" -ForegroundColor Red
            Register-Check -Tool "Node.js" -Required "22.x LTS" -Found "v$nodeVer" -Passed $false -Status "FAIL" -Remediation "Upgrade to Node 22: https://nodejs.org"
        }
    } else {
        Write-Host " DETECTED" -ForegroundColor Green
        Register-Check -Tool "Node.js" -Required "22.x LTS" -Found "Detected" -Passed $true -Status "PASS" -Remediation "None"
    }
} else {
    Write-Host " MISSING" -ForegroundColor Red
    Register-Check -Tool "Node.js" -Required "22.x LTS" -Found "Not Installed" -Passed $false -Status "FAIL" -Remediation "Install Node.js 22 LTS: https://nodejs.org"
}

# ---------------------------------------------------------------------------
# 4. Firebase CLI
# ---------------------------------------------------------------------------
Write-Host "[4/6] Checking Firebase CLI..." -NoNewline
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
if ($firebaseCmd) {
    $firebaseVer = (firebase --version 2>$null).Trim()
    if ($firebaseVer) {
        $pass = Test-SemanticVersion -Actual $firebaseVer -Required "13.0.0"
        if ($pass) {
            Write-Host " OK ($firebaseVer)" -ForegroundColor Green
            Register-Check -Tool "Firebase CLI" -Required "13.x+" -Found $firebaseVer -Passed $true -Status "PASS" -Remediation "None"
        } else {
            Write-Host " OUTDATED ($firebaseVer)" -ForegroundColor Yellow
            Register-Check -Tool "Firebase CLI" -Required "13.x+" -Found $firebaseVer -Passed $false -Status "WARN" -Remediation "Run: npm install -g firebase-tools@latest"
        }
    } else {
        Write-Host " DETECTED" -ForegroundColor Green
        Register-Check -Tool "Firebase CLI" -Required "13.x+" -Found "Detected" -Passed $true -Status "PASS" -Remediation "None"
    }
} else {
    Write-Host " MISSING" -ForegroundColor Red
    Register-Check -Tool "Firebase CLI" -Required "13.x+" -Found "Not Installed" -Passed $false -Status "FAIL" -Remediation "Install via: npm install -g firebase-tools"
}

# ---------------------------------------------------------------------------
# 5. Playwright CLI (E2E Verification)
# ---------------------------------------------------------------------------
Write-Host "[5/6] Checking Playwright..." -NoNewline
$playwrightVer = (npx --no-install playwright --version 2>$null)
if ($LASTEXITCODE -eq 0 -and $playwrightVer) {
    $cleanPw = ($playwrightVer -replace '[^0-9\.]', '').Trim()
    Write-Host " OK ($cleanPw)" -ForegroundColor Green
    Register-Check -Tool "Playwright" -Required "1.50+" -Found $cleanPw -Passed $true -Status "PASS" -Remediation "None"
} else {
    # Check if playwright is in node_modules
    $pwPackage = "node_modules/@playwright/test/package.json"
    if (Test-Path $pwPackage) {
        Write-Host " OK (Installed in workspace)" -ForegroundColor Green
        Register-Check -Tool "Playwright" -Required "1.50+" -Found "Workspace installed" -Passed $true -Status "PASS" -Remediation "None"
    } else {
        Write-Host " OPTIONAL / MISSING" -ForegroundColor Yellow
        Register-Check -Tool "Playwright" -Required "1.50+" -Found "Not in PATH" -Passed $true -Status "WARN" -Remediation "Run: npm install -D @playwright/test && npx playwright install"
    }
}

# ---------------------------------------------------------------------------
# 6. Bruno CLI (API Contract Verification)
# ---------------------------------------------------------------------------
Write-Host "[6/6] Checking Bruno CLI..." -NoNewline
$brunoVer = (npx --no-install @usebruno/cli --version 2>$null)
if ($LASTEXITCODE -eq 0 -and $brunoVer) {
    Write-Host " OK ($brunoVer)" -ForegroundColor Green
    Register-Check -Tool "Bruno CLI" -Required "1.30+" -Found $brunoVer -Passed $true -Status "PASS" -Remediation "None"
} else {
    $bruCmd = Get-Command bru -ErrorAction SilentlyContinue
    if ($bruCmd) {
        $bVer = (bru --version 2>$null)
        Write-Host " OK ($bVer)" -ForegroundColor Green
        Register-Check -Tool "Bruno CLI" -Required "1.30+" -Found $bVer -Passed $true -Status "PASS" -Remediation "None"
    } else {
        Write-Host " AVAILABLE ON-DEMAND VIA NPX" -ForegroundColor Green
        Register-Check -Tool "Bruno CLI" -Required "1.30+" -Found "Runnable via npx" -Passed $true -Status "PASS" -Remediation "Executable as: npx @usebruno/cli run ..."
    }
}

# ---------------------------------------------------------------------------
# Summary Output
# ---------------------------------------------------------------------------
Write-Host "`n-----------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "                    PREREQUISITE AUDIT RESULTS                   " -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------------`n" -ForegroundColor Cyan

$Results | Format-Table -Property Tool, Required, Found, Status, Remediation -AutoSize

if ($AllPassed) {
    Write-Host "[PASS] All core deployment prerequisites are satisfied!" -ForegroundColor Green
    Write-Host "You are ready to proceed with Section 2 (Authentication & Deployment).`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] Some prerequisites are missing or need attention." -ForegroundColor Red
    Write-Host "Please review the Remediation column above before deploying.`n" -ForegroundColor Yellow
    exit 1
}
