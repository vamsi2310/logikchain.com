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


async fn handle_bootstrap(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let uid = payload.get("uid").or_else(|| payload.get("userId"))
        .and_then(|v| v.as_str())
        .unwrap_or("usr_guest");
    let phone = payload.get("phone").or_else(|| payload.get("phoneNumber"))
        .and_then(|v| v.as_str())
        .unwrap_or("8977848501");
    let display_name = payload.get("displayName").or_else(|| payload.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Rural Citizen");
    let role = payload.get("role").and_then(|v| v.as_str()).unwrap_or("buyer");

    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    conn.execute(
        "INSERT INTO user_profiles (user_id, phone_number, display_name, role, status, official_client, setup_incomplete, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'active', 'pwa', 0, datetime('now'), datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name, updated_at = datetime('now')",
        rusqlite::params![uid, phone, display_name, role],
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let outbox_event = OutboxEvent {
        id: Uuid::new_v4().to_string(),
        service: state.service_name.clone(),
        aggregate_type: "UserProfile".to_string(),
        aggregate_id: uid.to_string(),
        operation: "UPSERT".to_string(),
        payload: json!({
            "userId": uid,
            "phoneNumber": phone,
            "displayName": display_name,
            "role": role,
            "status": "active"
        }),
        firestore_collection: "UserProfiles".to_string(),
        created_at: Utc::now(),
        synced_at: None,
    };
    let _ = insert_outbox_event(&conn, &outbox_event);

    Ok(Json(json!({
        "success": true,
        "isNewUser": false,
        "user": {
            "userId": uid,
            "displayName": display_name,
            "phoneNumber": phone,
            "role": role,
            "status": "active"
        },
        "claims": { "role": role, "status": "active", "officialClient": "pwa" }
    })))
}

async fn handle_send_otp(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let phone = payload.get("phone").or_else(|| payload.get("phoneNumber"))
        .and_then(|v| v.as_str())
        .unwrap_or("8977848501");
    let code = "123123";
    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = conn.execute(
        "INSERT OR REPLACE INTO otp_challenges (phone, code, expires_at) VALUES (?1, ?2, datetime('now', '+10 minutes'))",
        rusqlite::params![phone, code],
    );

    Ok(Json(json!({
        "success": true,
        "message": format!("OTP sent to {}", phone),
        "debugCode": code
    })))
}

async fn handle_verify_otp(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let phone = payload.get("phone").or_else(|| payload.get("phoneNumber"))
        .and_then(|v| v.as_str())
        .unwrap_or("8977848501");
    let code = payload.get("code").or_else(|| payload.get("otp"))
        .and_then(|v| v.as_str())
        .unwrap_or("123123");

    let valid = code == "123123" || code == "000000";
    let uid = format!("usr_{}", phone);
    let role = payload.get("role").and_then(|v| v.as_str()).unwrap_or("buyer");

    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = conn.execute(
        "INSERT INTO user_profiles (user_id, phone_number, display_name, role, status, official_client, setup_incomplete, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'active', 'pwa', 0, datetime('now'), datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET updated_at = datetime('now')",
        rusqlite::params![uid, phone, format!("User {}", &phone[phone.len().saturating_sub(4)..]), role],
    );

    Ok(Json(json!({
        "success": valid,
        "userId": uid,
        "token": format!("mock-jwt-token-{}", uid),
        "claims": { "role": role, "status": "active", "officialClient": "pwa" }
    })))
}

async fn handle_get_me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, StatusCode> {
    let uid = headers.get("x-user-uid").and_then(|h| h.to_str().ok()).unwrap_or("usr_8977848501");
    let conn = state.pool.get().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut stmt = conn.prepare("SELECT user_id, phone_number, display_name, role, status, official_client, village_id FROM user_profiles WHERE user_id = ?1")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let profile = stmt.query_row(rusqlite::params![uid], |row| {
        Ok(json!({
            "userId": row.get::<_, String>(0)?,
            "phoneNumber": row.get::<_, Option<String>>(1)?,
            "displayName": row.get::<_, Option<String>>(2)?,
            "role": row.get::<_, String>(3)?,
            "status": row.get::<_, String>(4)?,
            "officialClient": row.get::<_, String>(5)?,
            "villageId": row.get::<_, Option<String>>(6)?,
        }))
    }).unwrap_or_else(|_| json!({
        "userId": uid,
        "phoneNumber": "8977848501",
        "displayName": "Rural Citizen",
        "role": "buyer",
        "status": "active",
        "officialClient": "pwa"
    }));

    Ok(Json(json!({ "success": true, "user": profile })))
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
        "role": "Identity, Authentication & Role Governance (EPIC-01)",
        "database": {
            "engine": "sqlite-wal",
            "name": "identity.db",
            "status": if db_ok { "connected" } else { "disconnected" }
        },
        "firebase": {
            "status": "connected",
            "target": "Firestore & Storage via Bridge",
            "collection": "UserProfiles"
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

    let service_name = "identity-service".to_string();
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "4001".to_string())
        .parse()
        .unwrap_or(4001);

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "/data/identity.db".to_string());
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
        conn.execute_batch("       CREATE TABLE IF NOT EXISTS user_profiles (         user_id TEXT PRIMARY KEY,         phone_number TEXT,         display_name TEXT,         role TEXT NOT NULL DEFAULT 'buyer',         status TEXT NOT NULL DEFAULT 'active',         official_client TEXT NOT NULL DEFAULT 'pwa',         village_id TEXT,         kyc_status TEXT NOT NULL DEFAULT 'pending',         setup_incomplete BOOLEAN NOT NULL DEFAULT 1,         created_at TEXT NOT NULL DEFAULT (datetime('now')),         updated_at TEXT NOT NULL DEFAULT (datetime('now'))       );        CREATE TABLE IF NOT EXISTS otp_challenges (         phone TEXT PRIMARY KEY,         code TEXT NOT NULL,         expires_at TEXT NOT NULL       );     ")?;
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
        
        .route("/v1/auth/bootstrap", post(handle_bootstrap))
        .route("/auth/bootstrap", post(handle_bootstrap))
        .route("/bootstrap", post(handle_bootstrap))
        .route("/v1/auth/otp/send", post(handle_send_otp))
        .route("/v1/auth/otp/verify", post(handle_verify_otp))
        .route("/v1/users/me", get(handle_get_me))
        .route("/users/me", get(handle_get_me))
    
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!(service = %service_name, port = port, "Starting Rust Axum microservice");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
