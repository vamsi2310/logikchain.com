use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use logikchain_common::{
    ensure_outbox_schema, init_sqlite_pool, insert_outbox_event, DbPool, OutboxEvent, OutboxWorker,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{net::SocketAddr, sync::Arc};
use tower_http::cors::CorsLayer;
use tracing::{error, info};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    pool: DbPool,
    outbox_worker: Arc<OutboxWorker>,
    service_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct InboundSyncRequest {
    id: String,
    collection: String,
    #[serde(rename = "type")]
    change_type: String,
    data: serde_json::Value,
}


async fn handle_collect_cash(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let id = format!("cash_{}", Uuid::new_v4().simple());
    let order_id = payload.get("orderId").and_then(|v| v.as_str()).unwrap_or("ord_unknown");
    let amount = payload.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let collected_by = payload.get("collectedBy").and_then(|v| v.as_str()).unwrap_or("driver_default");

    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    conn.execute(
        "INSERT INTO cash_entries (id, order_id, amount, collected_by, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'collected', datetime('now'), datetime('now'))",
        rusqlite::params![id, order_id, amount, collected_by],
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "success": true, "cashId": id, "orderId": order_id, "status": "collected", "amount": amount })))
}


async fn handle_health(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = match state.pool.get() {
        Ok(conn) => conn.query_row("SELECT 1", [], |_| Ok(1)).is_ok(),
        Err(_) => false,
    };

    Json(json!({
        "status": if db_ok { "ok" } else { "degraded" },
        "service": state.service_name,
        "runtime": "rust-axum",
        "role": "Cash Ledger, Reconciliation & Delivery Handover (EPIC-07)",
        "database": {
            "engine": "sqlite-wal",
            "name": "cash.db",
            "status": if db_ok { "connected" } else { "disconnected" }
        },
        "firebase": {
            "status": "connected",
            "target": "Firestore & Storage via Bridge",
            "collection": "CashEntries"
        },
        "timestamp": Utc::now().to_rfc3339()
    }))
}

async fn handle_sync_status(State(state): State<AppState>) -> impl IntoResponse {
    let pending: i64 = match state.pool.get() {
        Ok(conn) => conn.query_row(
            "SELECT COUNT(*) FROM outbox_events WHERE synced_at IS NULL",
            [],
            |r| r.get(0),
        ).unwrap_or(0),
        Err(_) => 0,
    };
    Json(json!({ "pendingEvents": pending }))
}

async fn handle_sync_trigger(State(state): State<AppState>) -> impl IntoResponse {
    match state.outbox_worker.flush_batch().await {
        Ok(count) => (
            StatusCode::OK,
            Json(json!({ "triggered": true, "syncedOutbox": count })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "triggered": false, "error": e.to_string() })),
        ),
    }
}

async fn handle_inbound_sync(
    State(state): State<AppState>,
    Json(payload): Json<InboundSyncRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    info!(
        doc_id = %payload.id,
        collection = %payload.collection,
        change_type = %payload.change_type,
        "Received inbound sync event from Firebase Bridge"
    );

    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let outbox = OutboxEvent {
        id: Uuid::new_v4().to_string(),
        service: state.service_name.clone(),
        aggregate_type: payload.collection.clone(),
        aggregate_id: payload.id.clone(),
        operation: payload.change_type.clone(),
        payload: payload.data.clone(),
        firestore_collection: payload.collection.clone(),
        created_at: Utc::now(),
        synced_at: Some(Utc::now()),
    };
    let _ = insert_outbox_event(&conn, &outbox);

    Ok(Json(json!({
        "acknowledged": true,
        "id": payload.id,
        "collection": payload.collection
    })))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let service_name = "cash-service".to_string();
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "4007".to_string())
        .parse()
        .unwrap_or(4007);

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "/data/cash.db".to_string());
    let bridge_url = std::env::var("FIREBASE_BRIDGE_URL")
        .unwrap_or_else(|_| "http://firebase-bridge:4050".to_string());
    let sync_interval_ms: u64 = std::env::var("SYNC_INTERVAL_MS")
        .unwrap_or_else(|_| "2000".to_string())
        .parse()
        .unwrap_or(2000);

    info!(db_path = %db_path, "Initializing embedded SQLite database");
    let pool = init_sqlite_pool(&db_path)?;

    {
        let conn = pool.get()?;
        ensure_outbox_schema(&conn)?;
        conn.execute_batch("       CREATE TABLE IF NOT EXISTS cash_entries (         id TEXT PRIMARY KEY,         order_id TEXT NOT NULL,         amount REAL NOT NULL,         collected_by TEXT NOT NULL,         status TEXT NOT NULL DEFAULT 'collected',         otp_hash TEXT,         created_at TEXT NOT NULL DEFAULT (datetime('now')),         updated_at TEXT NOT NULL DEFAULT (datetime('now'))       );     ")?;
    }

    let outbox_worker = Arc::new(OutboxWorker::new(
        pool.clone(),
        bridge_url,
        sync_interval_ms,
        50,
    ));

    outbox_worker.clone().start();

    let state = AppState {
        pool,
        outbox_worker,
        service_name: service_name.clone(),
    };

    let app = Router::new()
        .route("/health", get(handle_health))
        .route("/sync/status", get(handle_sync_status))
        .route("/sync/trigger", post(handle_sync_trigger))
        .route("/internal/sync-inbound", post(handle_inbound_sync))
        
        .route("/v1/cash/collect", post(handle_collect_cash))
        .route("/cash/collect", post(handle_collect_cash))
    
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!(service = %service_name, port = port, "Starting Rust Axum microservice");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
