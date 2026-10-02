<#
.SYNOPSIS
  Deploy all Logikchain components (functions, firestore, storage, hosting) to PROD.

.PARAMETER Only
  Override target components (defaults to all).

.PARAMETER Force
  Skip interactive confirmation prompt.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.
#>
param(
  [string]$Only = "functions,firestore:rules,firestore:indexes,storage,hosting",
  [switch]$Force,
  [switch]$Interactive
)

$params = @{
  Alias = "prod"
  Only  = $Only
}
if ($Force) { $params["Force"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
