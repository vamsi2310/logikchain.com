<#
.SYNOPSIS
  Deploy Cloud Functions to PROD (logikchain-prod).

.PARAMETER OnlyFunction
  Optional specific function name or filter (e.g. 'api' or 'placeOrder').

.PARAMETER Force
  Skip interactive confirmation prompt.

.PARAMETER SkipBuild
  Skip the build step before deploying.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\functions\deploy-prod.ps1
  .\scripts\functions\deploy-prod.ps1 -Force
  .\scripts\functions\deploy-prod.ps1 -OnlyFunction api -Force
#>
param(
  [string]$OnlyFunction = "",
  [switch]$Force,
  [switch]$SkipBuild,
  [switch]$Interactive
)

$params = @{
  Alias = "prod"
}
if ($OnlyFunction) { $params["OnlyFunction"] = $OnlyFunction }
if ($Force) { $params["Force"] = $true }
if ($SkipBuild) { $params["SkipBuild"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
