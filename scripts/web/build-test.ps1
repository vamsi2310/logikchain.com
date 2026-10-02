<#
.SYNOPSIS
  Build the Web App for TEST environment (test mode).

.PARAMETER Clean
  Remove web/dist before building.

.PARAMETER CheckOnly
  Run TypeScript type check without building.
#>
param(
  [switch]$Clean,
  [switch]$CheckOnly
)

$params = @{ Alias = "test" }
if ($Clean) { $params["Clean"] = $true }
if ($CheckOnly) { $params["CheckOnly"] = $true }

& "$PSScriptRoot\build.ps1" @params
exit $LASTEXITCODE
