<#
.SYNOPSIS
  Main entrypoint: Deploy Logikchain stack (all components) to a Firebase alias.
  Delegates to scripts/stack/deploy.ps1.

.PARAMETER Alias
  Target environment: dev | test | prod.

.PARAMETER Only
  Target components: functions, hosting, firestore, storage.

.PARAMETER Force
  Skip interactive confirmation.

.PARAMETER CiRecovery
  Backwards-compatible alias for -Force.

.PARAMETER SkipBuild
  Skip build steps.

.PARAMETER Interactive
  Do not pass --non-interactive to firebase deploy.

.EXAMPLE
  .\scripts\deploy.ps1 -Alias dev
  .\scripts\deploy.ps1 -Alias dev -Only functions
  .\scripts\deploy.ps1 -Alias dev -Only hosting
  .\scripts\deploy.ps1 -Alias test -Force
  .\scripts\deploy.ps1 -Alias prod -Force
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("dev", "test", "prod")]
  [string]$Alias,

  [string]$Only = "",

  [switch]$Force,

  [switch]$CiRecovery,

  [switch]$SkipBuild,

  [switch]$Interactive
)

& "$PSScriptRoot\stack\deploy.ps1" @PSBoundParameters
exit $LASTEXITCODE
