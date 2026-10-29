# Logikchain Microservice Process & Port Tracker
param (
    [switch]$Watch
)

$services = @(
    @{ Epic = "EPIC-01"; Name = "identity-service"; Port = 4001; Service = "Identity, Auth & Access" },
    @{ Epic = "EPIC-02"; Name = "orders-service";   Port = 4002; Service = "Orders & Fulfillment" },
    @{ Epic = "EPIC-03"; Name = "gigs-service";     Port = 4003; Service = "Gig Logistics & Dispatch" },
    @{ Epic = "EPIC-04"; Name = "pamphlet-service"; Port = 4004; Service = "Pamphlet & Inventory" },
    @{ Epic = "EPIC-05"; Name = "payments-service"; Port = 4005; Service = "Payments & UPI" },
    @{ Epic = "EPIC-06"; Name = "payouts-service";  Port = 4006; Service = "Payouts & Disbursements" },
    @{ Epic = "EPIC-07"; Name = "cash-service";     Port = 4007; Service = "Rural Cash & CoD" },
    @{ Epic = "EPIC-08"; Name = "credit-service";   Port = 4008; Service = "Merchant Micro-Credit" },
    @{ Epic = "EPIC-09"; Name = "finance-service";  Port = 4009; Service = "Finance & Reconciliation" },
    @{ Epic = "EPIC-10"; Name = "config-service";   Port = 4010; Service = "Geo-Hierarchy & Config" },
    @{ Epic = "EPIC-11"; Name = "governance-service";Port = 4011; Service = "Governance & AML" },
    @{ Epic = "EPIC-12"; Name = "gateway";          Port = 8080; Service = "API Gateway & Sync" },
    @{ Epic = "EPIC-13"; Name = "social-connect";   Port = 4012; Service = "Social Connect & Alerts" },
    @{ Epic = "CLIENT";  Name = "web-pwa";          Port = 5173; Service = "Web PWA Application" }
)

function Show-Status {
    $time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host ""
    Write-Host "==========================================================================================" -ForegroundColor Cyan
    Write-Host "                LOGIKCHAIN MICROSERVICES PROCESS & PORT TRACKER               " -ForegroundColor Cyan
    Write-Host "                             Timestamp: $time                                " -ForegroundColor Gray
    Write-Host "==========================================================================================" -ForegroundColor Cyan

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

            $results += [PSCustomObject]@{
                Epic        = $s.Epic
                Microservice= $s.Name
                Port        = ":$($s.Port)"
                Status      = "[ACTIVE]"
                PID         = $pidVal
                ProcessName = $procName
                Memory      = $mem
            }
        } else {
            $results += [PSCustomObject]@{
                Epic        = $s.Epic
                Microservice= $s.Name
                Port        = ":$($s.Port)"
                Status      = "[OFFLINE]"
                PID         = "-"
                ProcessName = "-"
                Memory      = "-"
            }
        }
    }

    $results | Format-Table -AutoSize -Property Epic, Microservice, Port, Status, PID, ProcessName, Memory
}

if ($Watch) {
    Write-Host "Starting watch mode (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    while ($true) {
        Clear-Host
        Show-Status
        Start-Sleep -Seconds 3
    }
} else {
    Show-Status
}
