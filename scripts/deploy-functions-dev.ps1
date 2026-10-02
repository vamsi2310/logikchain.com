<#
.SYNOPSIS
  Deploy Cloud Functions to DEV (logikchaindevelopment).

.PARAMETER OnlyFunction
  Optional specific function name or filter (e.g. 'api' or 'placeOrder').

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\deploy-functions-dev.ps1
  .\scripts\deploy-functions-dev.ps1 -OnlyFunction api
#>
param(
  [string]$OnlyFunction = "",
  [switch]$Interactive
)

$params = @{
  Alias = "dev"
}
if ($OnlyFunction) { $params["OnlyFunction"] = $OnlyFunction }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy-functions.ps1" @params
exit $LASTEXITCODE
