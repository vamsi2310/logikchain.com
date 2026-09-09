<#
.SYNOPSIS
  Deploy Logikchain to a Firebase alias. Always passes --project <alias>.

.PARAMETER Alias
  dev | test | prod   (emulator starts local emulators; it does not deploy)

.PARAMETER Only
  Firebase --only targets. Default matches the playbook for that alias.

.PARAMETER CiRecovery
  Required to deploy to test from a laptop (logged CI-down recovery).

.EXAMPLE
  .\scripts\deploy.ps1 -Alias dev
  .\scripts\deploy.ps1 -Alias dev -Only functions
  .\scripts\deploy.ps1 -Alias emulator
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("emulator", "dev", "test", "prod")]
  [string]$Alias,

  [string]$Only = "",

  [switch]$CiRecovery
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Assert-NoBareDeploy {
  param([string[]]$Args)
  if ($Args -notcontains "--project") {
    throw "Deploy without --project <alias> is forbidden."
  }
}

if ($Alias -eq "emulator") {
  Write-Host "Starting emulator playbook (no firebase deploy)."
  Push-Location functions
  if (-not (Test-Path node_modules)) { npm install }
  npm run build
  Pop-Location
  firebase emulators:start --only auth,firestore,functions,storage,pubsub
  exit $LASTEXITCODE
}

if ($Alias -eq "prod") {
  Write-Error "Local prod deploy is forbidden. Production is CI on tag v* only."
  exit 1
}

if ($Alias -eq "test" -and -not $CiRecovery) {
  Write-Error "test is CI on every merge to main. Use -CiRecovery only to recover broken CI, and log the deploy."
  exit 1
}

if ([string]::IsNullOrWhiteSpace($Only)) {
  if ($Alias -eq "dev") {
    $Only = "functions,firestore:rules,firestore:indexes,storage,hosting"
  } else {
    $Only = "functions,firestore:rules,firestore:indexes,storage,hosting"
  }
}

$envFile = Join-Path "functions" ".env.$Alias"
if (Test-Path $envFile) {
  Write-Host "Loading $envFile into process (non-secrets)."
  Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
    $k, $v = $_ -split "=", 2
    Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim().Trim("'").Trim('"')
  }
}

Push-Location functions
if (-not (Test-Path node_modules)) { npm install }
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

$deployArgs = @("deploy", "--project", $Alias, "--only", $Only, "--non-interactive")
Assert-NoBareDeploy $deployArgs
Write-Host "firebase $($deployArgs -join ' ')"
firebase @deployArgs
exit $LASTEXITCODE
