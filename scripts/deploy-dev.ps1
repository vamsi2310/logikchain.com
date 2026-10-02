<#
.SYNOPSIS
  Deploy all Logikchain components (functions, firestore, storage, hosting) to DEV.

.PARAMETER Only
  Override target components (defaults to all).

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.
#>
param(
  [string]$Only = "functions,firestore:rules,firestore:indexes,storage,hosting",
  [switch]$Interactive
)

$params = @{
  Alias = "dev"
  Only  = $Only
}
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
