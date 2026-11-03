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


async fn handle_list_gigs(State(state): State<AppState>) -> Result<impl IntoResponse, StatusCode> {
    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut stmt = conn.prepare("SELECT id, title, pickup_location, dropoff_location, status, driver_id, price, created_at FROM gigs ORDER BY created_at DESC LIMIT 50")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let gigs: Vec<serde_json::Value> = stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "title": row.get::<_, String>(1)?,
            "pickupLocation": row.get::<_, String>(2)?,
            "dropoffLocation": row.get::<_, String>(3)?,
            "status": row.get::<_, String>(4)?,
            "driverId": row.get::<_, Option<String>>(5)?,
            "price": row.get::<_, f64>(6)?,
            "createdAt": row.get::<_, String>(7)?,
        }))
    }).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .filter_map(|r| r.ok())
    .collect();

    Ok(Json(json!({ "success": true, "gigs": gigs })))
}

async fn handle_create_gig(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let id = format!("gig_{}", Uuid::new_v4().simple());
    let title = payload.get("title").and_then(|v| v.as_str()).unwrap_or("Logistics Courier Delivery");
    let pickup = payload.get("pickupLocation").and_then(|v| v.as_str()).unwrap_or("Ongole Depot");
    let dropoff = payload.get("dropoffLocation").and_then(|v| v.as_str()).unwrap_or("Peridepi Village");
    let price = payload.get("price").and_then(|v| v.as_f64()).unwrap_or(250.0);

    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    conn.execute(
        "INSERT INTO gigs (id, title, pickup_location, dropoff_location, status, price, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'open', ?5, datetime('now'), datetime('now'))",
        rusqlite::params![id, title, pickup, dropoff, price],
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let outbox = OutboxEvent {
        id: Uuid::new_v4().to_string(),
        service: state.service_name.clone(),
        aggregate_type: "Gig".to_string(),
        aggregate_id: id.clone(),
        operation: "INSERT".to_string(),
        payload: json!({ "id": id, "title": title, "pickupLocation": pickup, "dropoffLocation": dropoff, "price": price, "status": "open" }),
        firestore_collection: "Gigs".to_string(),
        created_at: Utc::now(),
        synced_at: None,
    };
    let _ = insert_outbox_event(&conn, &outbox);

    Ok(Json(json!({ "success": true, "gig": { "id": id, "title": title, "status": "open", "price": price } })))
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
        "role": "Gigs, Transporter Matching & Escrow Execution (EPIC-04)",
        "database": {
            "engine": "sqlite-wal",
            "name": "gigs.db",
            "status": if db_ok { "connected" } else { "disconnected" }
        },
        "firebase": {
            "status": "connected",
            "target": "Firestore & Storage via Bridge",
            "collection": "Gigs"
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

    let service_name = "gigs-service".to_string();
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "4003".to_string())
        .parse()
        .unwrap_or(4003);

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "/data/gigs.db".to_string());
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
        conn.execute_batch("       CREATE TABLE IF NOT EXISTS gigs (         id TEXT PRIMARY KEY,         title TEXT NOT NULL,         pickup_location TEXT NOT NULL,         dropoff_location TEXT NOT NULL,         status TEXT NOT NULL DEFAULT 'open',         driver_id TEXT,         price REAL NOT NULL,         created_at TEXT NOT NULL DEFAULT (datetime('now')),         updated_at TEXT NOT NULL DEFAULT (datetime('now'))       );     ")?;
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
        
        .route("/v1/gigs", get(handle_list_gigs).post(handle_create_gig))
        .route("/gigs", get(handle_list_gigs).post(handle_create_gig))
    
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!(service = %service_name, port = port, "Starting Rust Axum microservice");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
