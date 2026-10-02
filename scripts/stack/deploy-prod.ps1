<#
.SYNOPSIS
  Deploy Logikchain stack (all components) to PROD (logikchain-prod).

.PARAMETER Only
  Firebase --only targets. Default: functions,firestore:rules,firestore:indexes,storage,hosting

.PARAMETER Force
  Skip confirmation prompts.

.PARAMETER SkipBuild
  Skip the build step before deploying.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.
#>
param(
  [string]$Only = "",
  [switch]$Force,
  [switch]$SkipBuild,
  [switch]$Interactive
)

$params = @{
  Alias = "prod"
}
if ($Only) { $params["Only"] = $Only }
if ($Force) { $params["Force"] = $true }
if ($SkipBuild) { $params["SkipBuild"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
