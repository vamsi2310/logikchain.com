<#
.SYNOPSIS
  Build and Deploy the Web App to PROD (logikchain-prod).

.PARAMETER SkipBuild
  Skip the build step and deploy the current web/dist directly.

.PARAMETER Force
  Skip interactive confirmation prompt.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\web\deploy-prod.ps1
  .\scripts\web\deploy-prod.ps1 -Force
#>
param(
  [switch]$SkipBuild,
  [switch]$Force,
  [switch]$Interactive
)

$params = @{
  Alias = "prod"
}
if ($SkipBuild) { $params["SkipBuild"] = $true }
if ($Force) { $params["Force"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
