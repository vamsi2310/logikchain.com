<#
.SYNOPSIS
  Deploy all Logikchain components (functions, firestore, storage, hosting) to TEST.

.PARAMETER Only
  Override target components (defaults to all).

.PARAMETER Force
  Skip confirmation prompts.

.PARAMETER CiRecovery
  Backwards-compatible alias for -Force.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.
#>
param(
  [string]$Only = "functions,firestore:rules,firestore:indexes,storage,hosting",
  [switch]$Force,
  [switch]$CiRecovery,
  [switch]$Interactive
)

$params = @{
  Alias = "test"
  Only  = $Only
}
if ($Force -or $CiRecovery) { $params["Force"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
