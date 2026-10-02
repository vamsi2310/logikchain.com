<#
.SYNOPSIS
  Build and Deploy the Web App to DEV (logikchaindevelopment).

.PARAMETER SkipBuild
  Skip the build step and deploy the current web/dist directly.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\web\deploy-dev.ps1
  .\scripts\web\deploy-dev.ps1 -SkipBuild
#>
param(
  [switch]$SkipBuild,
  [switch]$Interactive
)

$params = @{
  Alias = "dev"
}
if ($SkipBuild) { $params["SkipBuild"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy.ps1" @params
exit $LASTEXITCODE
