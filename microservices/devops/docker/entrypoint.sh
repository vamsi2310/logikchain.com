#!/bin/bash
set -e

# ==============================================================================
# Container Entrypoint: Self-Contained Microservice with In-Container PostgreSQL
# ==============================================================================

SERVICE_NAME="${SERVICE_NAME:-microservice}"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PGLOG_DIR="/var/log/postgresql"
PGRUN_DIR="/run/postgresql"

# Map service name to its dedicated PostgreSQL database name
case "$SERVICE_NAME" in
  identity-service)
    DB_NAME="identity_db"
    ;;
  orders-service)
    DB_NAME="orders_db"
    ;;
  gigs-service)
    DB_NAME="gigs_db"
    ;;
  pamphlet-service)
    DB_NAME="pamphlet_db"
    ;;
  payments-service)
    DB_NAME="payments_db"
    ;;
  payouts-service)
    DB_NAME="payouts_db"
    ;;
  cash-service)
    DB_NAME="cash_db"
    ;;
  credit-service)
    DB_NAME="credit_db"
    ;;
  finance-service)
    DB_NAME="finance_db"
    ;;
  config-service)
    DB_NAME="config_db"
    ;;
  governance-service)
    DB_NAME="governance_db"
    ;;
  social-connect-service)
    DB_NAME="social_connect_db"
    ;;
  sync-engine)
    DB_NAME="sync_db"
    ;;
  gateway)
    # API Gateway does not require a local PostgreSQL instance
    DB_NAME=""
    ;;
  *)
    DB_NAME="${DATABASE_NAME:-$(echo "$SERVICE_NAME" | tr '-' '_')_db}"
    ;;
esac

if [ -n "$DB_NAME" ]; then
  echo "==> [Container Boot] Initializing in-container PostgreSQL for ${SERVICE_NAME} (${DB_NAME})..."

  mkdir -p "$PGDATA" "$PGLOG_DIR" "$PGRUN_DIR"
  chown -R postgres:postgres "$PGDATA" "$PGLOG_DIR" "$PGRUN_DIR"
  chmod 0700 "$PGDATA"

  # Initialize cluster if this is first launch
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "==> [Container Boot] Initializing new PostgreSQL data cluster in ${PGDATA}..."
    su-exec postgres initdb -D "$PGDATA" -E UTF8 --auth-local=trust --auth-host=trust > /dev/null

    cat <<EOF >> "$PGDATA/postgresql.conf"
listen_addresses = '*'
port = 5432
max_connections = 100
shared_buffers = 128MB
fsync = off
synchronous_commit = off
EOF

    cat <<EOF > "$PGDATA/pg_hba.conf"
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
host    all             all             0.0.0.0/0               trust
EOF
  fi

  # Start PostgreSQL daemon in the background
  echo "==> [Container Boot] Starting local PostgreSQL daemon..."
  su-exec postgres pg_ctl -D "$PGDATA" -o "-p 5432" -l "$PGLOG_DIR/postgresql.log" start

  # Poll until PostgreSQL is ready to accept connections
  READY=0
  for i in $(seq 1 30); do
    if su-exec postgres pg_isready -h 127.0.0.1 -p 5432 -q; then
      READY=1
      echo "==> [Container Boot] In-container PostgreSQL is ready on port 5432."
      break
    fi
    sleep 1
  done

  if [ "$READY" -ne 1 ]; then
    echo "==> [Container Boot] ERROR: In-container PostgreSQL failed to start within 30 seconds."
    cat "$PGLOG_DIR/postgresql.log"
    exit 1
  fi

  # Ensure the service-specific database exists
  DB_EXISTS=$(su-exec postgres psql -h 127.0.0.1 -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")
  if [ "$DB_EXISTS" != "1" ]; then
    echo "==> [Container Boot] Creating local database '${DB_NAME}'..."
    su-exec postgres psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE ${DB_NAME};"
    su-exec postgres psql -h 127.0.0.1 -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO postgres;"
  fi

  # Set database connection environment variables for local service process
  export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/${DB_NAME}"
  export PGHOST="127.0.0.1"
  export PGPORT="5432"
  export PGUSER="postgres"
  export PGDATABASE="${DB_NAME}"
fi

# Graceful termination handler
cleanup() {
  echo "==> [Container Stop] Received termination signal. Stopping service and in-container PostgreSQL..."
  if [ -n "$APP_PID" ]; then
    kill -TERM "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi

  if [ -n "$DB_NAME" ]; then
    su-exec postgres pg_ctl -D "$PGDATA" -m fast stop || true
    echo "==> [Container Stop] In-container PostgreSQL cleanly stopped."
  fi
  exit 0
}

trap cleanup SIGTERM SIGINT SIGHUP

echo "==> [Container Launch] Launching ${SERVICE_NAME} application process..."
su-exec node "$@" &
APP_PID=$!

wait "$APP_PID"
EXIT_CODE=$?

if [ -n "$DB_NAME" ]; then
  su-exec postgres pg_ctl -D "$PGDATA" -m fast stop || true
fi

exit $EXIT_CODE

