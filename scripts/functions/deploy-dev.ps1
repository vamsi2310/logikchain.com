<#
.SYNOPSIS
  Deploy Cloud Functions to DEV (logikchaindevelopment).

.PARAMETER OnlyFunction
  Optional specific function name or filter (e.g. 'api' or 'placeOrder').

.PARAMETER SkipBuild
  Skip the build step before deploying.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\functions\deploy-dev.ps1
  .\scripts\functions\deploy-dev.ps1 -OnlyFunction api
#>
param(
  [string]$OnlyFunction = "",
  [switch]$SkipBuild,
  [switch]$Interactive
)

$params = @{
  Alias = "dev"
}
if ($OnlyFunction) { $params["OnlyFunction"] = $OnlyFunction }
if ($SkipBuild) { $params["SkipBuild"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
