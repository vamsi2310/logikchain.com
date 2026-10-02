<#
.SYNOPSIS
  Deploy Cloud Functions to PROD (logikchain-prod).

.PARAMETER OnlyFunction
  Optional specific function name or filter (e.g. 'api' or 'placeOrder').

.PARAMETER Force
  Skip interactive confirmation prompt.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\deploy-functions-prod.ps1
  .\scripts\deploy-functions-prod.ps1 -Force
  .\scripts\deploy-functions-prod.ps1 -OnlyFunction api -Force
#>
param(
  [string]$OnlyFunction = "",
  [switch]$Force,
  [switch]$Interactive
)

$params = @{
  Alias = "prod"
}
if ($OnlyFunction) { $params["OnlyFunction"] = $OnlyFunction }
if ($Force) { $params["Force"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy-functions.ps1" @params
exit $LASTEXITCODE
