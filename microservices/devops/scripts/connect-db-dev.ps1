<#
.SYNOPSIS
    Logikchain Database Backend Connector for Development Setup.
.DESCRIPTION
    Provides automated connection, lifecycle management, health inspection, and
    interactive psql access to the 13-database PostgreSQL mesh for local microservice development.

    Supports multiple backend backends:
      1. Kubernetes Cluster (Automatic port-forward to postgres-service)
      2. Local Docker / Docker Compose (logikchain-postgres container)
      3. Google Cloud SQL (via Cloud SQL Auth Proxy)
      4. Existing Host Database (localhost:5432)

.PARAMETER Action
    Operation to perform:
      - Start:       Ensures DB backend is up and exposed on localhost:5432 (auto-ports K8s or starts Docker)
      - Stop:        Stops background port-forward or Docker DB container
      - Restart:     Restarts the dev DB connector
      - Status:      Audits connectivity, latency, and table counts for all 13 service databases
      - Connect:     Opens an interactive psql shell to the specified database (via psql, kubectl, or docker)
      - Query:       Executes an ad-hoc SQL query against the target database
      - Init:        Executes init-databases.sql to ensure all 13 databases and outbox tables exist
      - ExportEnv:   Displays and validates connection strings for .env.development

.PARAMETER Database
    Target database name (e.g. config_db, identity_db, orders_db, sync_db). Defaults to config_db.
    Aliases: -Db

.PARAMETER Mode
    Backend mode: Auto (default), K8s, Docker, CloudSql, Host.

.PARAMETER Port
    Local port to bind or connect to (default: 5432).

.PARAMETER User
    PostgreSQL user (default: postgres).

.PARAMETER Password
    PostgreSQL password (default: postgrespassword).

.PARAMETER Query
    Ad-hoc SQL query string to run with -Action Query.

.PARAMETER Background
    Keep port-forward or proxy running in background.

.EXAMPLE
    .\connect-db-dev.ps1 -Action Start
    Ensures the dev DB backend is running and exposed at localhost:5432.

.EXAMPLE
    .\connect-db-dev.ps1 -Action Status
    Displays connectivity and health status across all 13 microservice databases.

.EXAMPLE
    .\connect-db-dev.ps1 -Action Connect -Database orders_db
    Launches an interactive psql shell directly into orders_db.

.EXAMPLE
    .\connect-db-dev.ps1 -Action Query -Database config_db -Query "SELECT name, status FROM villages LIMIT 5;"
    Executes a SQL query against config_db.
#>

[CmdletBinding()]
param(
    [ValidateSet('Start', 'Stop', 'Restart', 'Status', 'Connect', 'Query', 'Init', 'ExportEnv', 'PortForward')]
    [string]$Action = 'Start',

    [Alias('TargetDb', 'DatabaseName')]
    [string]$Database = 'config_db',

    [ValidateSet('Auto', 'K8s', 'Docker', 'CloudSql', 'Host')]
    [string]$Mode = 'Auto',

    [string]$HostName = 'localhost',
    [int]$Port = 5432,
    [string]$User = 'postgres',
    [string]$Password = 'postgrespassword',
    [string]$Query = '',
    [switch]$Background,
    [string]$CloudSqlInstance = 'logikchaindevelopment:asia-south1:logikchain-postgres-dev'
)

$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$MicroservicesDir = Resolve-Path "$ScriptDir\..\.."
$PidFile = "$ScriptDir\.db-connector.pid"

# All 13 Domain Microservice Databases
$ServiceDatabases = @(
    @{ Epic = "EPIC-01"; Service = "identity-service";       Db = "identity_db";       Port = 4001; Desc = "Identity, Auth & Access" },
    @{ Epic = "EPIC-02"; Service = "orders-service";         Db = "orders_db";         Port = 4002; Desc = "Orders & Commerce Fulfillment" },
    @{ Epic = "EPIC-03"; Service = "gigs-service";           Db = "gigs_db";           Port = 4003; Desc = "Gig Logistics & Fleet Dispatch" },
    @{ Epic = "EPIC-04"; Service = "pamphlet-service";       Db = "pamphlet_db";       Port = 4004; Desc = "Pamphlet & Inventory Distribution" },
    @{ Epic = "EPIC-05"; Service = "payments-service";       Db = "payments_db";       Port = 4005; Desc = "Payments, UPI & Collections" },
    @{ Epic = "EPIC-06"; Service = "payouts-service";        Db = "payouts_db";        Port = 4006; Desc = "Payouts & Disbursements" },
    @{ Epic = "EPIC-07"; Service = "cash-service";           Db = "cash_db";           Port = 4007; Desc = "Rural Cash & CoD Custody" },
    @{ Epic = "EPIC-08"; Service = "credit-service";         Db = "credit_db";         Port = 4008; Desc = "Merchant Working Capital Credit" },
    @{ Epic = "EPIC-09"; Service = "finance-service";        Db = "finance_db";        Port = 4009; Desc = "Financial Ledger & Reconciliation" },
    @{ Epic = "EPIC-10"; Service = "config-service";         Db = "config_db";         Port = 4010; Desc = "Platform Geo-Hierarchy & Config" },
    @{ Epic = "EPIC-11"; Service = "governance-service";     Db = "governance_db";     Port = 4011; Desc = "Platform Governance & AML" },
    @{ Epic = "EPIC-12"; Service = "gateway / sync-engine";  Db = "sync_db";           Port = 8080; Desc = "Transactional Outbox & Sync CDC" },
    @{ Epic = "EPIC-13"; Service = "social-connect-service"; Db = "social_connect_db"; Port = 4012; Desc = "Social Connect & Notifications" }
)

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "            LOGIKCHAIN DEV DB BACKEND CONNECTOR                                " -ForegroundColor Cyan
    Write-Host "            $Title" -ForegroundColor Gray
    Write-Host "================================================================================" -ForegroundColor Cyan
}

function Test-TcpPort {
    param(
        [string]$TargetHost = '127.0.0.1',
        [int]$TargetPort = 5432,
        [int]$TimeoutMs = 1000
    )
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect($TargetHost, $TargetPort, $null, $null)
        $wh = $iar.AsyncWaitHandle
        if (-not $wh.WaitOne($TimeoutMs, $false)) {
            $client.Close()
            return $false
        }
        $client.EndConnect($iar)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Get-ActiveBackendMode {
    if ($Mode -ne 'Auto') {
        return $Mode
    }

    # 1. Check if 5432 is already listening on host
    if (Test-TcpPort -TargetHost $HostName -TargetPort $Port) {
        return 'Host'
    }

    # 2. Check if Kubernetes pod postgres-0 is running in logikchain-backend
    $k8sPod = kubectl get pods -n logikchain-backend -l app=postgres --no-headers 2>$null
    if ($LASTEXITCODE -eq 0 -and $k8sPod -match 'Running') {
        return 'K8s'
    }

    # 3. Check if Docker container logikchain-postgres exists
    $dockerContainer = docker ps --filter "name=logikchain-postgres" --format "{{.Status}}" 2>$null
    if ($LASTEXITCODE -eq 0 -and $dockerContainer) {
        return 'Docker'
    }

    # Fallback to Docker if Docker engine is available
    $dockerOk = docker info 2>$null
    if ($LASTEXITCODE -eq 0) {
        return 'Docker'
    }

    return 'Host'
}

function Start-K8sPortForward {
    Write-Host "[K8s] Checking Kubernetes postgres pod in 'logikchain-backend'..." -ForegroundColor Cyan
    $podStatus = kubectl get pods -n logikchain-backend -l app=postgres --no-headers 2>$null
    if (-not $podStatus -or $podStatus -notmatch 'Running') {
        Write-Host "  -> postgres pod is not running in logikchain-backend. Applying manifest..." -ForegroundColor Yellow
        kubectl apply -f "$MicroservicesDir\devops\k8s\local\00-postgres-local.yaml"
        Write-Host "  -> Waiting for postgres StatefulSet to be ready..." -ForegroundColor Gray
        kubectl rollout status statefulset/postgres -n logikchain-backend --timeout=60s
    }

    Write-Host "[K8s] Launching background port-forward (127.0.0.1:5432 -> svc/postgres-service:5432)..." -ForegroundColor Cyan
    
    # Check if existing forward process recorded
    Stop-ExistingForwarder

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "kubectl"
    $startInfo.Arguments = "port-forward svc/postgres-service 5432:5432 -n logikchain-backend"
    $startInfo.CreateNoWindow = $true
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $proc = [System.Diagnostics.Process]::Start($startInfo)
    $proc.Id | Out-File -FilePath $PidFile -Encoding ASCII

    # Wait for port to become active
    $attempts = 0
    while ($attempts -lt 15) {
        Start-Sleep -Milliseconds 600
        if (Test-TcpPort -TargetHost '127.0.0.1' -TargetPort 5432) {
            Write-Host "  -> Kubernetes port-forward established! (PID: $($proc.Id))" -ForegroundColor Green
            return $true
        }
        $attempts++
    }

    Write-Host "  -> Warning: Port-forward started (PID $($proc.Id)), waiting for initial handshake..." -ForegroundColor Yellow
    return $true
}

function Start-DockerPostgres {
    Write-Host "[Docker] Starting local PostgreSQL container..." -ForegroundColor Cyan
    $dockerComposeFile = "$MicroservicesDir\docker-compose.yml"
    
    if (Test-Path $dockerComposeFile) {
        Write-Host "  -> Running: docker compose up -d postgres" -ForegroundColor Gray
        docker compose -f $dockerComposeFile up -d postgres
    } else {
        Write-Host "  -> Running standalone docker container: logikchain-postgres..." -ForegroundColor Gray
        docker run -d --name logikchain-postgres `
            -e POSTGRES_USER=postgres `
            -e POSTGRES_PASSWORD=postgrespassword `
            -p 5432:5432 `
            -v "$ScriptDir\init-databases.sql:/docker-entrypoint-initdb.d/init.sql" `
            postgres:16-alpine
    }

    # Wait for container healthcheck
    $attempts = 0
    while ($attempts -lt 20) {
        Start-Sleep -Seconds 1
        if (Test-TcpPort -TargetHost '127.0.0.1' -TargetPort 5432) {
            Write-Host "  -> Local Docker PostgreSQL container ready on 127.0.0.1:5432!" -ForegroundColor Green
            return $true
        }
        $attempts++
    }

    Write-Host "  -> Timed out waiting for Docker PostgreSQL on port 5432." -ForegroundColor Red
    return $false
}

function Start-CloudSqlProxy {
    Write-Host "[CloudSQL] Launching Google Cloud SQL Auth Proxy..." -ForegroundColor Cyan
    $proxyCmd = Get-Command cloud-sql-proxy -ErrorAction SilentlyContinue
    if (-not $proxyCmd) {
        $proxyCmd = Get-Command cloud_sql_proxy -ErrorAction SilentlyContinue
    }

    if (-not $proxyCmd) {
        Write-Host "  -> cloud-sql-proxy CLI not found in PATH." -ForegroundColor Red
        Write-Host "     Install via: winget install Google.CloudSQLProxy or gcloud components install cloud-sql-proxy" -ForegroundColor Yellow
        return $false
    }

    Stop-ExistingForwarder

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $proxyCmd.Source
    $startInfo.Arguments = "--port 5432 $CloudSqlInstance"
    $startInfo.CreateNoWindow = $true
    $startInfo.UseShellExecute = $false

    $proc = [System.Diagnostics.Process]::Start($startInfo)
    $proc.Id | Out-File -FilePath $PidFile -Encoding ASCII

    $attempts = 0
    while ($attempts -lt 15) {
        Start-Sleep -Milliseconds 800
        if (Test-TcpPort -TargetHost '127.0.0.1' -TargetPort 5432) {
            Write-Host "  -> Cloud SQL Auth Proxy active! (Instance: $CloudSqlInstance, PID: $($proc.Id))" -ForegroundColor Green
            return $true
        }
        $attempts++
    }

    return $true
}

function Stop-ExistingForwarder {
    if (Test-Path $PidFile) {
        try {
            $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue
            if ($oldPid -and ($oldPid -match '^\d+$')) {
                $proc = Get-Process -Id [int]$oldPid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  -> Stopping previous background connector process (PID: $oldPid)..." -ForegroundColor Gray
                    Stop-Process -Id [int]$oldPid -Force -ErrorAction SilentlyContinue
                }
            }
        } catch {}
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
}

function Execute-Sql {
    param(
        [string]$TargetDb = 'config_db',
        [string]$SqlCommand
    )

    # 1. Try native psql if port 5432 is open
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCmd -and (Test-TcpPort -TargetHost $HostName -TargetPort $Port)) {
        $env:PGPASSWORD = $Password
        $res = & $psqlCmd.Source -h $HostName -p $Port -U $User -d $TargetDb -t -c $SqlCommand 2>$null
        return ($res | Out-String).Trim()
    }

    # 2. Try kubectl exec if k8s postgres pod is alive
    $k8sOk = kubectl get pod postgres-0 -n logikchain-backend --no-headers 2>$null
    if ($LASTEXITCODE -eq 0 -and $k8sOk -match 'Running') {
        $res = kubectl exec -n logikchain-backend postgres-0 -- psql -U $User -d $TargetDb -t -c $SqlCommand 2>$null
        return ($res | Out-String).Trim()
    }

    # 3. Try docker exec
    $dockerOk = docker ps --filter "name=postgres" --format "{{.ID}}" 2>$null
    if ($LASTEXITCODE -eq 0 -and $dockerOk) {
        $res = docker exec -i ($dockerOk.Split("`n")[0]) psql -U $User -d $TargetDb -t -c $SqlCommand 2>$null
        return ($res | Out-String).Trim()
    }

    return $null
}

function Ensure-DatabasesInitialized {
    Write-Host "`n[Init] Checking database schemas against init-databases.sql..." -ForegroundColor Cyan
    $initSqlFile = "$ScriptDir\init-databases.sql"
    if (-not (Test-Path $initSqlFile)) {
        Write-Host "  -> Warning: init-databases.sql not found at $initSqlFile" -ForegroundColor Yellow
        return
    }

    $existingDbs = Execute-Sql -TargetDb "postgres" -SqlCommand "SELECT datname FROM pg_database WHERE datistemplate = false;"
    $missingDbs = @()
    foreach ($entry in $ServiceDatabases) {
        if ($existingDbs -notmatch $entry.Db) {
            $missingDbs += $entry.Db
        }
    }

    if ($missingDbs.Count -gt 0) {
        Write-Host "  -> Found missing databases: $($missingDbs -join ', ')" -ForegroundColor Yellow
        Write-Host "  -> Executing initialization script: init-databases.sql..." -ForegroundColor Cyan

        $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
        if ($psqlCmd -and (Test-TcpPort -TargetHost $HostName -TargetPort $Port)) {
            $env:PGPASSWORD = $Password
            Get-Content $initSqlFile | & $psqlCmd.Source -h $HostName -p $Port -U $User -d postgres 2>$null
        } else {
            Get-Content $initSqlFile | kubectl exec -i -n logikchain-backend postgres-0 -- psql -U $User -d postgres 2>$null
        }
        Write-Host "  -> Databases initialized successfully!" -ForegroundColor Green
    } else {
        Write-Host "  -> All 13 microservice databases are present in catalog." -ForegroundColor Green
    }

    # Ensure sync_db schema has its outbox and inbound event tables
    $syncOutbox = Execute-Sql -TargetDb "sync_db" -SqlCommand "SELECT to_regclass('public.outbox_events');"
    if (-not $syncOutbox -or $syncOutbox -notmatch 'outbox_events') {
        Write-Host "  -> Initializing sync_db CDC outbox tables..." -ForegroundColor Cyan
        $syncSql = @"
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  operation VARCHAR(16) NOT NULL,
  payload JSONB NOT NULL,
  firestore_collection VARCHAR(64) NOT NULL,
  firestore_doc_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE TABLE IF NOT EXISTS storage_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(64) NOT NULL,
  bucket_name VARCHAR(128) NOT NULL,
  storage_path VARCHAR(256) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_data_base64 TEXT,
  operation VARCHAR(16) NOT NULL DEFAULT 'UPLOAD',
  sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS inbound_firestore_events (
  collection VARCHAR(64) NOT NULL,
  doc_id VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, doc_id)
);
"@
        Execute-Sql -TargetDb "sync_db" -SqlCommand $syncSql | Out-Null
        Write-Host "  -> sync_db tables initialized!" -ForegroundColor Green
    }
}

function Show-MeshStatus {
    Write-Header "PostgreSQL Mesh Telemetry Audit (13 Databases)"

    $portListening = Test-TcpPort -TargetHost $HostName -TargetPort $Port
    $detectedMode = Get-ActiveBackendMode

    Write-Host "Backend Mode     : " -NoNewline
    Write-Host $detectedMode -ForegroundColor Green
    Write-Host "Host & Port      : " -NoNewline
    Write-Host "$HostName`:$Port" -ForegroundColor $(if ($portListening) { 'Green' } else { 'Yellow' })
    Write-Host "Port Status      : " -NoNewline
    if ($portListening) {
        Write-Host "LISTENING (Ready for local service connections)" -ForegroundColor Green
    } else {
        Write-Host "NOT LISTENING (Run -Action Start to activate)" -ForegroundColor Yellow
    }
    Write-Host ""

    $Results = [System.Collections.Generic.List[PSCustomObject]]::new()
    $onlineCount = 0

    foreach ($item in $ServiceDatabases) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $dbName = $item.Db
        
        # Test connection & table count
        $tableCountStr = Execute-Sql -TargetDb $dbName -SqlCommand "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
        $sw.Stop()
        $latencyMs = $sw.ElapsedMilliseconds

        $status = "OFFLINE"
        $tables = "0"
        $hasOutbox = "NO"

        if ($tableCountStr -and ($tableCountStr -match '^\d+$')) {
            $status = "ONLINE"
            $tables = $tableCountStr.Trim()
            $onlineCount++

            # Check outbox_events table
            $outboxCheck = Execute-Sql -TargetDb $dbName -SqlCommand "SELECT to_regclass('public.outbox_events');"
            if ($outboxCheck -and $outboxCheck -match 'outbox_events') {
                $hasOutbox = "YES"
            }
        }

        $Results.Add([PSCustomObject]@{
            Epic        = $item.Epic
            Service     = $item.Service
            Database    = $item.Db
            Port        = $item.Port
            Status      = $status
            Latency     = "$($latencyMs)ms"
            Tables      = $tables
            OutboxTable = $hasOutbox
        })
    }

    $Results | Format-Table -Property Epic, Service, Database, Port, Status, Latency, Tables, OutboxTable -AutoSize

    Write-Host "Database Mesh Health: $onlineCount / 13 Databases Online" -ForegroundColor $(if ($onlineCount -eq 13) { 'Green' } else { 'Yellow' })
    Write-Host ""
}

function Open-InteractivePsql {
    param([string]$TargetDb)

    Write-Header "Connecting to: $TargetDb"
    Write-Host "Starting interactive PostgreSQL shell..." -ForegroundColor Cyan
    Write-Host "Type '\q' to exit shell." -ForegroundColor Gray
    Write-Host ""

    # Ensure backend port is up
    if (-not (Test-TcpPort -TargetHost $HostName -TargetPort $Port)) {
        Write-Host "Port 5432 not listening. Activating dev connector..." -ForegroundColor Yellow
        $ok = Start-BackendConnector
        if (-not $ok) {
            Write-Host "Failed to connect to DB backend." -ForegroundColor Red
            return
        }
    }

    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCmd) {
        $env:PGPASSWORD = $Password
        & $psqlCmd.Source -h $HostName -p $Port -U $User -d $TargetDb
        return
    }

    # Fallback to kubectl exec
    $k8sOk = kubectl get pod postgres-0 -n logikchain-backend --no-headers 2>$null
    if ($LASTEXITCODE -eq 0 -and $k8sOk -match 'Running') {
        kubectl exec -it -n logikchain-backend postgres-0 -- psql -U $User -d $TargetDb
        return
    }

    # Fallback to docker exec
    $dockerOk = docker ps --filter "name=postgres" --format "{{.Names}}" 2>$null
    if ($dockerOk) {
        $cName = ($dockerOk.Split("`n")[0]).Trim()
        docker exec -it $cName psql -U $User -d $TargetDb
        return
    }

    Write-Host "Neither native 'psql', Kubernetes postgres-0 pod, nor Docker container found." -ForegroundColor Red
}

function Start-BackendConnector {
    $currentMode = Get-ActiveBackendMode
    Write-Host "[Connector] Detected Backend Source: $currentMode" -ForegroundColor Cyan

    switch ($currentMode) {
        'Host' {
            Write-Host "  -> PostgreSQL already active on host (127.0.0.1:5432)." -ForegroundColor Green
            return $true
        }
        'K8s' {
            return Start-K8sPortForward
        }
        'Docker' {
            return Start-DockerPostgres
        }
        'CloudSql' {
            return Start-CloudSqlProxy
        }
        Default {
            Write-Host "  -> Unknown mode: $currentMode. Trying K8s then Docker..." -ForegroundColor Yellow
            $k8sRes = Start-K8sPortForward
            if ($k8sRes) { return $true }
            return Start-DockerPostgres
        }
    }
}

function Export-EnvConfig {
    Write-Header "Microservices .env.development Database URLs"

    $lines = @(
        "# Logikchain Microservices Database-Per-Service URLs",
        "DATABASE_HOST=$HostName",
        "DATABASE_PORT=$Port",
        "DATABASE_USER=$User",
        "DATABASE_PASSWORD=$Password"
    )

    foreach ($item in $ServiceDatabases) {
        $varName = "$($item.Db.ToUpper())_URL"
        $url = "postgresql://${User}:${Password}@${HostName}:${Port}/$($item.Db)"
        $lines += "$varName=$url"
        Write-Host "$varName=" -NoNewline -ForegroundColor Gray
        Write-Host $url -ForegroundColor Green
    }

    Write-Host "`nTip: These variables match microservices/.env.development" -ForegroundColor Cyan
}

# ==============================================================================
# MAIN DISPATCHER
# ==============================================================================
switch ($Action) {
    'Start' {
        Write-Header "Starting Dev Database Backend Connector"
        $started = Start-BackendConnector
        if ($started) {
            Ensure-DatabasesInitialized
            Show-MeshStatus
            Write-Host "Dev DB Backend is connected and ready for microservices!" -ForegroundColor Green
            Write-Host "To open an interactive psql session: .\connect-db-dev.ps1 -Action Connect -Database <db_name>`n" -ForegroundColor Gray
        } else {
            Write-Host "Failed to start database backend connector." -ForegroundColor Red
            exit 1
        }
    }

    'PortForward' {
        Write-Header "Kubernetes Port-Forward"
        Start-K8sPortForward
        Show-MeshStatus
    }

    'Stop' {
        Write-Header "Stopping Database Backend Connector"
        Stop-ExistingForwarder
        Write-Host "Dev DB Connector stopped successfully." -ForegroundColor Green
    }

    'Restart' {
        Write-Header "Restarting Database Backend Connector"
        Stop-ExistingForwarder
        Start-Sleep -Seconds 1
        Start-BackendConnector
        Show-MeshStatus
    }

    'Status' {
        Show-MeshStatus
    }

    'Init' {
        Write-Header "Initializing All Databases & Outbox Tables"
        if (-not (Test-TcpPort -TargetHost $HostName -TargetPort $Port)) {
            Start-BackendConnector
        }
        Ensure-DatabasesInitialized
        Show-MeshStatus
    }

    'Connect' {
        Open-InteractivePsql -TargetDb $Database
    }

    'Query' {
        if (-not $Query) {
            Write-Host "Error: Please specify -Query 'SQL STATEMENT'" -ForegroundColor Red
            exit 1
        }
        Write-Header "Executing Query on $Database"
        Write-Host "Query: $Query" -ForegroundColor Yellow
        $output = Execute-Sql -TargetDb $Database -SqlCommand $Query
        Write-Host ""
        Write-Host $output -ForegroundColor White
        Write-Host ""
    }

    'ExportEnv' {
        Export-EnvConfig
    }
}
