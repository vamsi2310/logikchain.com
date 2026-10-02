<#
.SYNOPSIS
  Deploy Logikchain stack (all components) to TEST (logikchain-test).

.PARAMETER Only
  Firebase --only targets. Default: functions,firestore:rules,firestore:indexes,storage,hosting

.PARAMETER Force
  Skip confirmation prompts.

.PARAMETER CiRecovery
  Backwards-compatible alias for -Force.

.PARAMETER SkipBuild
  Skip the build step before deploying.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.
#>
param(
  [string]$Only = "",
  [switch]$Force,
  [switch]$CiRecovery,
  [switch]$SkipBuild,
  [switch]$Interactive
)

$params = @{
  Alias = "test"
}
if ($Only) { $params["Only"] = $Only }
if ($Force -or $CiRecovery) { $params["Force"] = $true }
if ($SkipBuild) { $params["SkipBuild"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
