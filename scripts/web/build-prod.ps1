<#
.SYNOPSIS
  Build the Web App for PRODUCTION environment (production mode).

.PARAMETER Clean
  Remove web/dist before building.

.PARAMETER CheckOnly
  Run TypeScript type check without building.
#>
param(
  [switch]$Clean,
  [switch]$CheckOnly
)

$params = @{ Alias = "prod" }
if ($Clean) { $params["Clean"] = $true }
if ($CheckOnly) { $params["CheckOnly"] = $true }

& "$PSScriptRoot\build.ps1" @params
exit $LASTEXITCODE
