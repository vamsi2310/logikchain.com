use anyhow::{Context, Result};
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::path::Path;
use tracing::info;

pub type DbPool = Pool<SqliteConnectionManager>;

pub fn init_sqlite_pool<P: AsRef<Path>>(db_path: P) -> Result<DbPool> {
    let path = db_path.as_ref();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create directory for database: {:?}", parent))?;
    }

    let manager = SqliteConnectionManager::file(path);
    let pool = Pool::builder()
        .max_size(16)
        .build(manager)
        .context("Failed to create SQLite connection pool")?;

    // Apply performance and concurrency pragmas on an initial connection
    let conn = pool.get().context("Failed to acquire initial connection from pool")?;
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 5000;
        PRAGMA foreign_keys = ON;
        ",
    )
    .context("Failed to execute SQLite PRAGMA configuration")?;

    info!(path = ?path, "SQLite initialized successfully in WAL mode");
    Ok(pool)
}

pub fn ensure_outbox_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS outbox_events (
            id TEXT PRIMARY KEY,
            service TEXT NOT NULL,
            aggregate_type TEXT NOT NULL,
            aggregate_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            firestore_collection TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            synced_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_outbox_events_pending 
            ON outbox_events(synced_at) 
            WHERE synced_at IS NULL;
        ",
    )
    .context("Failed to create outbox_events table")?;

    Ok(())
}

pub fn insert_outbox_event(
    conn: &Connection,
    event: &crate::models::OutboxEvent,
) -> Result<()> {
    conn.execute(
        "INSERT INTO outbox_events (id, service, aggregate_type, aggregate_id, operation, payload, firestore_collection, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            event.id,
            event.service,
            event.aggregate_type,
            event.aggregate_id,
            event.operation,
            event.payload.to_string(),
            event.firestore_collection,
            event.created_at.to_rfc3339(),
        ],
    )?;
    Ok(())
}

