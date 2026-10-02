<#
.SYNOPSIS
  Deploy Logikchain stack (all components) to DEV (logikchaindevelopment).

.PARAMETER Only
  Firebase --only targets. Default: functions,firestore:rules,firestore:indexes,storage,hosting

.PARAMETER SkipBuild
  Skip the build step before deploying.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.
#>
param(
  [string]$Only = "",
  [switch]$SkipBuild,
  [switch]$Interactive
)

$params = @{
  Alias = "dev"
}
if ($Only) { $params["Only"] = $Only }
if ($SkipBuild) { $params["SkipBuild"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
