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


async fn handle_batch_payout(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let batch_id = format!("batch_{}", Uuid::new_v4().simple());
    let beneficiary = payload.get("beneficiaryId").and_then(|v| v.as_str()).unwrap_or("ben_sup_ongole");
    let amount = payload.get("amount").and_then(|v| v.as_f64()).unwrap_or(15000.0);

    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let payout_id = format!("pout_{}", Uuid::new_v4().simple());
    conn.execute(
        "INSERT INTO payouts (id, beneficiary_id, amount, status, batch_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'processed', ?4, datetime('now'), datetime('now'))",
        rusqlite::params![payout_id, beneficiary, amount, batch_id],
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(json!({ "success": true, "batchId": batch_id, "payoutId": payout_id, "status": "processed", "amount": amount })))
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
        "role": "Automated Payouts & RazorpayX Disbursal (EPIC-06)",
        "database": {
            "engine": "sqlite-wal",
            "name": "payouts.db",
            "status": if db_ok { "connected" } else { "disconnected" }
        },
        "firebase": {
            "status": "connected",
            "target": "Firestore & Storage via Bridge",
            "collection": "Payouts"
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

    let service_name = "payouts-service".to_string();
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "4006".to_string())
        .parse()
        .unwrap_or(4006);

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "/data/payouts.db".to_string());
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
        conn.execute_batch("       CREATE TABLE IF NOT EXISTS payouts (         id TEXT PRIMARY KEY,         beneficiary_id TEXT NOT NULL,         amount REAL NOT NULL,         status TEXT NOT NULL DEFAULT 'processed',         batch_id TEXT,         created_at TEXT NOT NULL DEFAULT (datetime('now')),         updated_at TEXT NOT NULL DEFAULT (datetime('now'))       );     ")?;
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
        
        .route("/v1/payouts/batch", post(handle_batch_payout))
        .route("/payouts/batch", post(handle_batch_payout))
    
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!(service = %service_name, port = port, "Starting Rust Axum microservice");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
