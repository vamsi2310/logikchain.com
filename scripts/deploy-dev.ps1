param([string]$Only = "functions,firestore:rules,firestore:indexes,storage,hosting")
& "$PSScriptRoot\deploy.ps1" -Alias dev -Only $Only
exit $LASTEXITCODE
