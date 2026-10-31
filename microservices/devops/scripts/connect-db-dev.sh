#!/usr/bin/env bash
# ==============================================================================
# Logikchain Database Backend Connector for Development Setup
# ==============================================================================
# Usage:
#   ./connect-db-dev.sh [action] [database] [args...]
#
# Actions:
#   start          Ensure DB backend is up on localhost:5432 (K8s or Docker)
#   stop           Stop background port-forward or Docker DB container
#   restart        Restart the DB backend connector
#   status         Audit connectivity & table count across all 13 DBs
#   connect [db]   Launch interactive psql session into target database
#   query [db] [q] Execute ad-hoc SQL query against database
#   init           Run init-databases.sql and sync_db schema setup
#   export-env     Print environment variables for .env.development
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MICROSERVICES_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PID_FILE="$SCRIPT_DIR/.db-connector.pid"

ACTION="${1:-start}"
DATABASE="${2:-config_db}"
SQL_QUERY="${3:-}"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgrespassword}"
export PGPASSWORD="$DB_PASSWORD"

# Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

DATABASES=(
  "EPIC-01:identity-service:identity_db:4001"
  "EPIC-02:orders-service:orders_db:4002"
  "EPIC-03:gigs-service:gigs_db:4003"
  "EPIC-04:pamphlet-service:pamphlet_db:4004"
  "EPIC-05:payments-service:payments_db:4005"
  "EPIC-06:payouts-service:payouts_db:4006"
  "EPIC-07:cash-service:cash_db:4007"
  "EPIC-08:credit-service:credit_db:4008"
  "EPIC-09:finance-service:finance_db:4009"
  "EPIC-10:config-service:config_db:4010"
  "EPIC-11:governance-service:governance_db:4011"
  "EPIC-12:gateway-sync:sync_db:8080"
  "EPIC-13:social-connect-service:social_connect_db:4012"
)

print_header() {
  echo -e "\n${CYAN}================================================================================${NC}"
  echo -e "${CYAN}            LOGIKCHAIN DEV DB BACKEND CONNECTOR                                ${NC}"
  echo -e "${CYAN}            $1${NC}"
  echo -e "${CYAN}================================================================================${NC}"
}

test_port() {
  if command -v nc >/dev/null 2>&1; then
    nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1
  else
    (echo > /dev/tcp/"$DB_HOST"/"$DB_PORT") >/dev/null 2>&1
  fi
}

detect_mode() {
  if test_port; then
    echo "Host"
    return
  fi
  if kubectl get pods -n logikchain-backend -l app=postgres --no-headers 2>/dev/null | grep -q "Running"; then
    echo "K8s"
    return
  fi
  if docker ps --filter "name=logikchain-postgres" --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
    echo "Docker"
    return
  fi
  if docker info >/dev/null 2>&1; then
    echo "Docker"
    return
  fi
  echo "Host"
}

stop_forwarder() {
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      echo -e "  -> Stopping background connector (PID: $OLD_PID)..."
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi
}

start_k8s_forward() {
  echo -e "${CYAN}[K8s] Checking postgres in logikchain-backend...${NC}"
  stop_forwarder

  echo -e "${CYAN}[K8s] Launching port-forward in background (127.0.0.1:5432 -> svc/postgres-service:5432)...${NC}"
  kubectl port-forward svc/postgres-service 5432:5432 -n logikchain-backend >/dev/null 2>&1 &
  FORWARD_PID=$!
  echo "$FORWARD_PID" > "$PID_FILE"

  for i in {1..15}; do
    sleep 0.5
    if test_port; then
      echo -e "  -> ${GREEN}Kubernetes port-forward active on 127.0.0.1:5432 (PID: $FORWARD_PID)${NC}"
      return 0
    fi
  done
  echo -e "  -> ${YELLOW}Warning: Waiting for port-forward handshake...${NC}"
  return 0
}

start_docker_postgres() {
  echo -e "${CYAN}[Docker] Starting local PostgreSQL container...${NC}"
  if [ -f "$MICROSERVICES_DIR/docker-compose.yml" ]; then
    docker compose -f "$MICROSERVICES_DIR/docker-compose.yml" up -d postgres
  else
    docker run -d --name logikchain-postgres \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgrespassword \
      -p 5432:5432 \
      -v "$SCRIPT_DIR/init-databases.sql:/docker-entrypoint-initdb.d/init.sql" \
      postgres:16-alpine
  fi

  for i in {1..20}; do
    sleep 1
    if test_port; then
      echo -e "  -> ${GREEN}Local Docker PostgreSQL ready on 127.0.0.1:5432!${NC}"
      return 0
    fi
  done
  echo -e "  -> ${RED}Timed out waiting for Docker PostgreSQL on port 5432.${NC}"
  return 1
}

start_backend() {
  MODE=$(detect_mode)
  echo -e "${CYAN}[Connector] Detected Backend Mode: $MODE${NC}"
  case "$MODE" in
    "Host")
      echo -e "  -> ${GREEN}PostgreSQL port 5432 is already active on host.${NC}"
      return 0
      ;;
    "K8s")
      start_k8s_forward
      ;;
    "Docker")
      start_docker_postgres
      ;;
    *)
      start_k8s_forward || start_docker_postgres
      ;;
  esac
}

exec_sql() {
  local target_db="$1"
  local sql="$2"

  if command -v psql >/dev/null 2>&1 && test_port; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -c "$sql" 2>/dev/null | xargs
    return
  fi

  if kubectl get pods -n logikchain-backend -l app=postgres --no-headers 2>/dev/null | grep -q "Running"; then
    kubectl exec -n logikchain-backend postgres-0 -- psql -U "$DB_USER" -d "$target_db" -t -c "$sql" 2>/dev/null | xargs
    return
  fi

  if docker ps --filter "name=postgres" --format "{{.ID}}" 2>/dev/null | grep -q .; then
    local cid=$(docker ps --filter "name=postgres" --format "{{.ID}}" | head -n1)
    docker exec -i "$cid" psql -U "$DB_USER" -d "$target_db" -t -c "$sql" 2>/dev/null | xargs
    return
  fi
}

show_status() {
  print_header "PostgreSQL Mesh Telemetry Audit (13 Databases)"
  MODE=$(detect_mode)
  echo -e "Backend Mode     : ${GREEN}$MODE${NC}"
  echo -e "Host & Port      : ${GREEN}$DB_HOST:$DB_PORT${NC}"
  if test_port; then
    echo -e "Port Status      : ${GREEN}LISTENING (Ready for local service connections)${NC}\n"
  else
    echo -e "Port Status      : ${YELLOW}NOT LISTENING (Run './connect-db-dev.sh start' to activate)${NC}\n"
  fi

  printf "%-8s %-24s %-20s %-6s %-8s %-8s %-12s\n" "Epic" "Service" "Database" "Port" "Status" "Tables" "OutboxTable"
  echo "----------------------------------------------------------------------------------------"

  local online_count=0
  for row in "${DATABASES[@]}"; do
    IFS=":" read -r epic service db port <<< "$row"
    table_count=$(exec_sql "$db" "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" || echo "0")
    if [[ "$table_count" =~ ^[0-9]+$ ]] && [ "$table_count" -gt 0 ]; then
      status="ONLINE"
      ((online_count++))
      outbox=$(exec_sql "$db" "SELECT to_regclass('public.outbox_events');" || echo "")
      if [[ "$outbox" == *"outbox_events"* ]]; then
        has_outbox="YES"
      else
        has_outbox="NO"
      fi
    else
      status="OFFLINE"
      has_outbox="NO"
      table_count="0"
    fi
    printf "%-8s %-24s %-20s %-6s %-8s %-8s %-12s\n" "$epic" "$service" "$db" "$port" "$status" "$table_count" "$has_outbox"
  done

  echo -e "\n${CYAN}Database Mesh Health: $online_count / 13 Databases Online${NC}\n"
}

init_databases() {
  print_header "Initializing All Databases & Outbox Tables"
  if ! test_port; then
    start_backend
  fi

  echo -e "${CYAN}[Init] Checking database schemas against init-databases.sql...${NC}"
  local init_file="$SCRIPT_DIR/init-databases.sql"
  if [ -f "$init_file" ]; then
    if command -v psql >/dev/null 2>&1 && test_port; then
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -f "$init_file" >/dev/null 2>&1 || true
    else
      kubectl exec -i -n logikchain-backend postgres-0 -- psql -U "$DB_USER" -d postgres < "$init_file" >/dev/null 2>&1 || true
    fi
    echo -e "  -> ${GREEN}init-databases.sql executed successfully!${NC}"
  fi

  # Ensure sync_db tables
  exec_sql "sync_db" "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"; CREATE TABLE IF NOT EXISTS outbox_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), service VARCHAR(64) NOT NULL, aggregate_type VARCHAR(64) NOT NULL, aggregate_id VARCHAR(64) NOT NULL, operation VARCHAR(16) NOT NULL, payload JSONB NOT NULL, firestore_collection VARCHAR(64) NOT NULL, firestore_doc_id VARCHAR(64) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), synced_at TIMESTAMPTZ, sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING', retry_count INT NOT NULL DEFAULT 0, last_error TEXT); CREATE TABLE IF NOT EXISTS storage_sync_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), service VARCHAR(64) NOT NULL, bucket_name VARCHAR(128) NOT NULL, storage_path VARCHAR(256) NOT NULL, mime_type VARCHAR(64) NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, file_data_base64 TEXT, operation VARCHAR(16) NOT NULL DEFAULT 'UPLOAD', sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), synced_at TIMESTAMPTZ); CREATE TABLE IF NOT EXISTS inbound_firestore_events (collection VARCHAR(64) NOT NULL, doc_id VARCHAR(64) NOT NULL, payload JSONB NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (collection, doc_id));" >/dev/null 2>&1 || true

  show_status
}

connect_psql() {
  local target_db="$1"
  print_header "Connecting to: $target_db"
  echo -e "${CYAN}Type '\q' to exit shell.${NC}\n"

  if ! test_port; then
    start_backend
  fi

  if command -v psql >/dev/null 2>&1; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db"
    return
  fi

  if kubectl get pods -n logikchain-backend -l app=postgres --no-headers 2>/dev/null | grep -q "Running"; then
    kubectl exec -it -n logikchain-backend postgres-0 -- psql -U "$DB_USER" -d "$target_db"
    return
  fi

  if docker ps --filter "name=postgres" --format "{{.Names}}" 2>/dev/null | grep -q .; then
    local cname=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -n1)
    docker exec -it "$cname" psql -U "$DB_USER" -d "$target_db"
    return
  fi

  echo -e "${RED}Neither native psql, Kubernetes pod, nor Docker container found.${NC}"
}

export_env() {
  print_header "Microservices .env.development Database URLs"
  for row in "${DATABASES[@]}"; do
    IFS=":" read -r epic service db port <<< "$row"
    upper_db=$(echo "$db" | tr '[:lower:]' '[:upper:]')
    echo "${upper_db}_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${db}"
  done
  echo -e "\n${CYAN}Tip: These URLs match microservices/.env.development${NC}"
}

# ==============================================================================
# DISPATCHER
# ==============================================================================
case "$ACTION" in
  start|up)
    print_header "Starting Dev Database Backend Connector"
    start_backend
    init_databases
    ;;
  stop|down)
    print_header "Stopping Database Backend Connector"
    stop_forwarder
    echo -e "${GREEN}Dev DB Connector stopped.${NC}"
    ;;
  restart)
    print_header "Restarting Database Backend Connector"
    stop_forwarder
    sleep 1
    start_backend
    show_status
    ;;
  status|check)
    show_status
    ;;
  init)
    init_databases
    ;;
  connect|shell)
    connect_psql "$DATABASE"
    ;;
  query)
    if [ -z "$SQL_QUERY" ]; then
      echo -e "${RED}Error: Usage: ./connect-db-dev.sh query [database] \"SELECT ...\"${NC}"
      exit 1
    fi
    print_header "Executing Query on $DATABASE"
    exec_sql "$DATABASE" "$SQL_QUERY"
    ;;
  export-env)
    export_env
    ;;
  *)
    echo "Usage: ./connect-db-dev.sh {start|stop|restart|status|connect|query|init|export-env} [database] [query]"
    exit 1
    ;;
esac
