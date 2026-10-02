<#
.SYNOPSIS
  Deploy Cloud Functions to TEST (logikchain-test).

.PARAMETER OnlyFunction
  Optional specific function name or filter (e.g. 'api' or 'placeOrder').

.PARAMETER Force
  Skip confirmation prompts.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\deploy-functions-test.ps1
  .\scripts\deploy-functions-test.ps1 -OnlyFunction api
#>
param(
  [string]$OnlyFunction = "",
  [switch]$Force,
  [switch]$Interactive
)

$params = @{
  Alias = "test"
}
if ($OnlyFunction) { $params["OnlyFunction"] = $OnlyFunction }
if ($Force) { $params["Force"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy-functions.ps1" @params
exit $LASTEXITCODE
