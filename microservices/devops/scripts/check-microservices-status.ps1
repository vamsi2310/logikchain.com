# ===========================================================================
# Logikchain Microservices Status & Health Checker
# ===========================================================================
# Audits each domain microservice (EPIC-01 through EPIC-13) and the API Gateway:
# 1. TCP Port Listener & PID Check
# 2. HTTP /health Endpoint Probe
# 3. Memory & Latency Telemetry
#
# Usage:
#   .\check-microservices-status.ps1            # Single-pass check
#   .\check-microservices-status.ps1 -Watch     # Live auto-refresh every 3s
#   .\check-microservices-status.ps1 -Json      # Output as JSON
# ===========================================================================

param (
    [switch]$Watch,
    [switch]$Json,
    [int]$TimeoutMs = 1200
)

$services = @(
    @{ Epic = "EPIC-01"; Name = "identity-service";       Port = 4001; Db = "identity_db";       Desc = "Identity, Auth & Access" },
    @{ Epic = "EPIC-02"; Name = "orders-service";         Port = 4002; Db = "orders_db";         Desc = "Orders & Commerce Fulfillment" },
    @{ Epic = "EPIC-03"; Name = "gigs-service";           Port = 4003; Db = "gigs_db";           Desc = "Gig Logistics & Fleet Dispatch" },
    @{ Epic = "EPIC-04"; Name = "pamphlet-service";       Port = 4004; Db = "pamphlet_db";       Desc = "Pamphlet & Inventory Distribution" },
    @{ Epic = "EPIC-05"; Name = "payments-service";       Port = 4005; Db = "payments_db";       Desc = "Payments, UPI & Collections" },
    @{ Epic = "EPIC-06"; Name = "payouts-service";        Port = 4006; Db = "payouts_db";        Desc = "Payouts & Disbursements" },
    @{ Epic = "EPIC-07"; Name = "cash-service";           Port = 4007; Db = "cash_db";           Desc = "Rural Cash & CoD Custody" },
    @{ Epic = "EPIC-08"; Name = "credit-service";         Port = 4008; Db = "credit_db";         Desc = "Merchant Working Capital Credit" },
    @{ Epic = "EPIC-09"; Name = "finance-service";        Port = 4009; Db = "finance_db";        Desc = "Financial Ledger & Reconciliation" },
    @{ Epic = "EPIC-10"; Name = "config-service";         Port = 4010; Db = "config_db";         Desc = "Platform Geo-Hierarchy & Config" },
    @{ Epic = "EPIC-11"; Name = "governance-service";     Port = 4011; Db = "governance_db";     Desc = "Platform Governance & AML" },
    @{ Epic = "EPIC-12"; Name = "gateway";                Port = 8080; Db = "sync_db";           Desc = "API Gateway & Bidirectional Sync" },
    @{ Epic = "EPIC-13"; Name = "social-connect-service"; Port = 4012; Db = "social_connect_db"; Desc = "Social Connect & Notifications" }
)

function Test-MicroserviceHealth {
    param (
        [string]$Url,
        [int]$Timeout
    )
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $req = [System.Net.HttpWebRequest]::Create($Url)
        $req.Timeout = $Timeout
        $req.Method = "GET"
        $req.UserAgent = "Logikchain-DevOps-Checker/1.0"
        
        $res = $req.GetResponse()
        $sw.Stop()
        $statusCode = [int]$res.StatusCode
        $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
        $res.Close()

        $jsonObj = $null
        try { $jsonObj = $body | ConvertFrom-Json } catch {}

        return @{
            Success = $true
            HttpStatus = $statusCode
            LatencyMs = $sw.ElapsedMilliseconds
            StatusText = if ($jsonObj.status) { $jsonObj.status } else { "ok" }
            Details = if ($jsonObj.error) { $jsonObj.error } else { $null }
        }
    } catch [System.Net.WebException] {
        $sw.Stop()
        $res = $_.Exception.Response
        if ($res) {
            $statusCode = [int]$res.StatusCode
            $reader = New-Object System.IO.StreamReader($res.GetResponseStream())
            $body = $reader.ReadToEnd()
            $reader.Close()
            $res.Close()
            $jsonObj = $null
            try { $jsonObj = $body | ConvertFrom-Json } catch {}
            return @{
                Success = $false
                HttpStatus = $statusCode
                LatencyMs = $sw.ElapsedMilliseconds
                StatusText = if ($jsonObj.status) { $jsonObj.status } else { "degraded" }
                Details = if ($jsonObj.error) { $jsonObj.error } else { $_.Exception.Message }
            }
        }
        return @{
            Success = $false
            HttpStatus = 0
            LatencyMs = $sw.ElapsedMilliseconds
            StatusText = "unreachable"
            Details = $_.Exception.Message
        }
    } catch {
        $sw.Stop()
        return @{
            Success = $false
            HttpStatus = 0
            LatencyMs = $sw.ElapsedMilliseconds
            StatusText = "error"
            Details = $_.Exception.Message
        }
    }
}

function Audit-AllServices {
    $time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue

    $results = @()

    foreach ($s in $services) {
        $p = $s.Port
        $match = $listeners | Where-Object { $_.LocalPort -eq $p } | Select-Object -First 1

        if ($match) {
            $pidVal = $match.OwningProcess
            $proc = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
            $procName = if ($proc) { $proc.ProcessName } else { "Unknown" }
            $mem = if ($proc) { "$([math]::Round($proc.WorkingSet64 / 1MB, 1)) MB" } else { "-" }

            # Test HTTP Health
            $health = Test-MicroserviceHealth -Url "http://localhost:$p/health" -Timeout $TimeoutMs

            $state = "ONLINE"
            if ($health.StatusText -eq "degraded" -or ($health.HttpStatus -ge 500)) {
                $state = "DEGRADED"
            } elseif (-not $health.Success -and $health.HttpStatus -eq 0) {
                $state = "UNRESPONSIVE"
            }

            $results += [PSCustomObject]@{
                Epic         = $s.Epic
                Microservice = $s.Name
                Port         = ":$p"
                PID          = $pidVal
                Process      = $procName
                Memory       = $mem
                HttpStatus   = if ($health.HttpStatus -gt 0) { "$($health.HttpStatus)" } else { "-" }
                Latency      = if ($health.LatencyMs -gt 0) { "$($health.LatencyMs)ms" } else { "-" }
                HealthState  = $state
                Database     = $s.Db
            }
        } else {
            $results += [PSCustomObject]@{
                Epic         = $s.Epic
                Microservice = $s.Name
                Port         = ":$p"
                PID          = "-"
                Process      = "-"
                Memory       = "-"
                HttpStatus   = "-"
                Latency      = "-"
                HealthState  = "OFFLINE"
                Database     = $s.Db
            }
        }
    }

    if ($Json) {
        $results | ConvertTo-Json -Depth 3
        return
    }

    Write-Host ""
    Write-Host "================================================================================================" -ForegroundColor Cyan
    Write-Host "                    LOGIKCHAIN DEVOPS: MICROSERVICES HEALTH & PROCESS AUDIT                     " -ForegroundColor Cyan
    Write-Host "                                   Timestamp: $time                                             " -ForegroundColor Gray
    Write-Host "================================================================================================" -ForegroundColor Cyan

    $results | Format-Table -AutoSize -Property @(
        @{ Label = "Epic"; Expression = { $_.Epic }; Width = 9 },
        @{ Label = "Microservice"; Expression = { $_.Microservice }; Width = 23 },
        @{ Label = "Port"; Expression = { $_.Port }; Width = 7 },
        @{ Label = "Health State"; Expression = {
            switch ($_.HealthState) {
                "ONLINE"       { "[+] ONLINE" }
                "DEGRADED"     { "[!] DEGRADED" }
                "UNRESPONSIVE" { "[?] HANGING" }
                default        { "[-] OFFLINE" }
            }
        }; Width = 14 },
        @{ Label = "HTTP"; Expression = { $_.HttpStatus }; Width = 6 },
        @{ Label = "Latency"; Expression = { $_.Latency }; Width = 9 },
        @{ Label = "PID"; Expression = { $_.PID }; Width = 7 },
        @{ Label = "Process"; Expression = { $_.Process }; Width = 10 },
        @{ Label = "RAM"; Expression = { $_.Memory }; Width = 10 },
        @{ Label = "Database"; Expression = { $_.Database }; Width = 18 }
    )

    $onlineCount = @($results | Where-Object { $_.HealthState -eq "ONLINE" }).Count
    $degradedCount = @($results | Where-Object { $_.HealthState -eq "DEGRADED" }).Count
    $offlineCount = @($results | Where-Object { $_.HealthState -eq "OFFLINE" }).Count

    Write-Host "Summary: $onlineCount Online | $degradedCount Degraded | $offlineCount Offline / Unstarted`n" -ForegroundColor Cyan
}

if ($Watch) {
    Write-Host "Starting continuous watch mode (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    while ($true) {
        Clear-Host
        Audit-AllServices
        Start-Sleep -Seconds 3
    }
} else {
    Audit-AllServices
}
