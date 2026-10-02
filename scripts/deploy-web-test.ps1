<#
.SYNOPSIS
  Build and Deploy the Web App to TEST (logikchain-test).

.PARAMETER SkipBuild
  Skip the build step and deploy the current web/dist directly.

.PARAMETER Force
  Skip interactive confirmation prompt.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\deploy-web-test.ps1
  .\scripts\deploy-web-test.ps1 -Force
#>
param(
  [switch]$SkipBuild,
  [switch]$Force,
  [switch]$Interactive
)

$params = @{
  Alias = "test"
}
if ($SkipBuild) { $params["SkipBuild"] = $true }
if ($Force) { $params["Force"] = $true }
if ($Interactive) { $params["Interactive"] = $true }

& "$PSScriptRoot\deploy-web.ps1" @params
exit $LASTEXITCODE
