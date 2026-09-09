param(
  [string]$Only = "functions,firestore:rules,firestore:indexes,storage,hosting",
  [switch]$CiRecovery
)
if (-not $CiRecovery) {
  Write-Error "test is CI on main. Re-run with -CiRecovery only to recover broken CI."
  exit 1
}
& "$PSScriptRoot\deploy.ps1" -Alias test -Only $Only -CiRecovery
exit $LASTEXITCODE
