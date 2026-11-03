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
struct CreateOrderRequest {
    #[serde(rename = "buyerId")]
    buyer_id: String,
    #[serde(rename = "merchantId")]
    merchant_id: Option<String>,
    #[serde(rename = "supplierId")]
    supplier_id: Option<String>,
    #[serde(rename = "gigId")]
    gig_id: Option<String>,
    items: serde_json::Value,
    #[serde(rename = "totalAmount")]
    total_amount: f64,
    #[serde(rename = "paymentType")]
    payment_type: String,
    #[serde(rename = "deliveryAddress")]
    delivery_address: Option<serde_json::Value>,
    #[serde(rename = "creditHoldId")]
    credit_hold_id: Option<String>,
    #[serde(rename = "paymentIntentId")]
    payment_intent_id: Option<String>,
    #[serde(rename = "idempotencyKey")]
    idempotency_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OrderRecord {
    order_id: String,
    buyer_id: String,
    merchant_id: Option<String>,
    supplier_id: Option<String>,
    gig_id: Option<String>,
    status: String,
    payment_type: String,
    total_amount: f64,
    items: serde_json::Value,
    delivery_address: serde_json::Value,
    captured_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct InboundSyncRequest {
    id: String,
    collection: String,
    #[serde(rename = "type")]
    change_type: String,
    data: serde_json::Value,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let service_name = "orders-service".to_string();
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "4002".to_string())
        .parse()
        .unwrap_or(4002);

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "/data/orders.db".to_string());
    let bridge_url = std::env::var("FIREBASE_BRIDGE_URL")
        .unwrap_or_else(|_| "http://firebase-bridge:4050".to_string());
    let sync_interval_ms: u64 = std::env::var("SYNC_INTERVAL_MS")
        .unwrap_or_else(|_| "2000".to_string())
        .parse()
        .unwrap_or(2000);

    info!(db_path = %db_path, "Initializing embedded SQLite database");
    let pool = init_sqlite_pool(&db_path)?;

    // Setup SQLite schema
    {
        let conn = pool.get()?;
        ensure_outbox_schema(&conn)?;
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                buyer_id TEXT NOT NULL,
                merchant_id TEXT,
                supplier_id TEXT,
                gig_id TEXT,
                status TEXT NOT NULL,
                payment_type TEXT NOT NULL,
                total_amount REAL NOT NULL,
                items TEXT NOT NULL,
                delivery_address TEXT NOT NULL DEFAULT '{}',
                credit_hold_id TEXT,
                payment_intent_id TEXT,
                departure_manifest TEXT,
                dispatched_at TEXT,
                handover_otp TEXT,
                delivered_at TEXT,
                idempotency_key TEXT UNIQUE,
                captured_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS order_handovers (
                handover_id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                driver_id TEXT NOT NULL,
                otp_code TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                verified_at TEXT,
                signature_pod TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            ",
        )?;
        info!("Orders SQLite tables verified");
    }

    // Launch the transactional outbox background worker
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
        service_name,
    };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/sync/status", get(sync_status))
        .route("/sync/trigger", post(sync_trigger))
        .route("/v1/orders", post(create_order).get(list_orders))
        .route("/v1/orders/:id", get(get_order))
        .route("/internal/sync-inbound", post(handle_inbound_sync))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!(addr = %addr, "Orders microservice (Rust + Axum + SQLite) listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    let db_status = match state.pool.get() {
        Ok(conn) => match conn.query_row("SELECT 1", [], |_| Ok(())) {
            Ok(_) => json!({ "status": "connected", "engine": "sqlite-wal" }),
            Err(e) => json!({ "status": "disconnected", "error": e.to_string() }),
        },
        Err(e) => json!({ "status": "disconnected", "error": e.to_string() }),
    };

    Json(json!({
        "status": "ok",
        "service": state.service_name,
        "runtime": "rust-axum",
        "timestamp": Utc::now().to_rfc3339(),
        "database": db_status
    }))
}

async fn sync_status(State(state): State<AppState>) -> impl IntoResponse {
    let pending_count: i64 = match state.pool.get() {
        Ok(conn) => conn
            .query_row(
                "SELECT COUNT(*) FROM outbox_events WHERE synced_at IS NULL",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0),
        Err(_) => 0,
    };

    Json(json!({
        "service": state.service_name,
        "pendingOutbox": pending_count,
        "timestamp": Utc::now().to_rfc3339()
    }))
}

async fn sync_trigger(State(state): State<AppState>) -> impl IntoResponse {
    match state.outbox_worker.flush_batch().await {
        Ok(synced) => (
            StatusCode::OK,
            Json(json!({ "triggered": true, "syncedCount": synced })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "triggered": false, "error": e.to_string() })),
        ),
    }
}

async fn create_order(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateOrderRequest>,
) -> impl IntoResponse {
    let mut conn = match state.pool.get() {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Database connection error", "details": e.to_string() })),
            )
        }
    };

    let idempotency_key = headers
        .get("idempotency-key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .or(payload.idempotency_key);

    let order_id = format!("ord_{}", Uuid::new_v4().simple());
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let status = "CONFIRMED".to_string();

    let delivery_address = payload
        .delivery_address
        .unwrap_or_else(|| json!({ "village": "rural_default" }));

    let order_doc = json!({
        "orderId": order_id,
        "buyerId": payload.buyer_id,
        "merchantId": payload.merchant_id,
        "supplierId": payload.supplier_id,
        "gigId": payload.gig_id,
        "status": status,
        "paymentType": payload.payment_type,
        "totalAmount": payload.total_amount,
        "items": payload.items,
        "deliveryAddress": delivery_address,
        "capturedAt": now_str,
    });

    let outbox_event = OutboxEvent {
        id: Uuid::new_v4().to_string(),
        service: "orders-service".to_string(),
        aggregate_type: "Order".to_string(),
        aggregate_id: order_id.clone(),
        operation: "CREATE".to_string(),
        payload: order_doc.clone(),
        firestore_collection: "Orders".to_string(),
        created_at: now,
        synced_at: None,
    };

    // Atomic SQLite transaction: Order insert + Outbox event
    let tx_res = conn.transaction();
    match tx_res {
        Ok(tx) => {
            let res = tx.execute(
                "INSERT INTO orders (
                    order_id, buyer_id, merchant_id, supplier_id, gig_id,
                    status, payment_type, total_amount, items, delivery_address,
                    credit_hold_id, payment_intent_id, idempotency_key, captured_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
                rusqlite::params![
                    order_id,
                    payload.buyer_id,
                    payload.merchant_id,
                    payload.supplier_id,
                    payload.gig_id,
                    status,
                    payload.payment_type,
                    payload.total_amount,
                    payload.items.to_string(),
                    delivery_address.to_string(),
                    payload.credit_hold_id,
                    payload.payment_intent_id,
                    idempotency_key,
                    now_str,
                    now_str,
                ],
            );

            if let Err(e) = res {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Failed inserting order", "details": e.to_string() })),
                );
            }

            if let Err(e) = insert_outbox_event(&tx, &outbox_event) {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Failed recording outbox", "details": e.to_string() })),
                );
            }

            if let Err(e) = tx.commit() {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Failed committing transaction", "details": e.to_string() })),
                );
            }

            info!(order_id = %order_id, "Order created atomically in SQLite with outbox record");
            (StatusCode::CREATED, Json(order_doc))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Failed opening transaction", "details": e.to_string() })),
        ),
    }
}

async fn get_order(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let conn = match state.pool.get() {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Database error", "details": e.to_string() })),
            )
        }
    };

    let mut stmt = match conn.prepare(
        "SELECT order_id, buyer_id, merchant_id, supplier_id, gig_id, status, payment_type, total_amount, items, delivery_address, captured_at
         FROM orders WHERE order_id = ?1",
    ) {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Statement error", "details": e.to_string() })),
            )
        }
    };

    let order = stmt.query_row([id], |row| {
        let items_str: String = row.get(8)?;
        let addr_str: String = row.get(9)?;
        Ok(OrderRecord {
            order_id: row.get(0)?,
            buyer_id: row.get(1)?,
            merchant_id: row.get(2)?,
            supplier_id: row.get(3)?,
            gig_id: row.get(4)?,
            status: row.get(5)?,
            payment_type: row.get(6)?,
            total_amount: row.get(7)?,
            items: serde_json::from_str(&items_str).unwrap_or(json!([])),
            delivery_address: serde_json::from_str(&addr_str).unwrap_or(json!({})),
            captured_at: row.get(10)?,
        })
    });

    match order {
        Ok(rec) => (StatusCode::OK, Json(json!(rec))),
        Err(rusqlite::Error::QueryReturnedNoRows) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Order not found" })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Query failed", "details": e.to_string() })),
        ),
    }
}

async fn list_orders(State(state): State<AppState>) -> impl IntoResponse {
    let conn = match state.pool.get() {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Database error", "details": e.to_string() })),
            )
        }
    };

    let mut stmt = match conn.prepare(
        "SELECT order_id, buyer_id, merchant_id, supplier_id, gig_id, status, payment_type, total_amount, items, delivery_address, captured_at
         FROM orders ORDER BY captured_at DESC LIMIT 50",
    ) {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Statement error", "details": e.to_string() })),
            )
        }
    };

    let rows = stmt.query_map([], |row| {
        let items_str: String = row.get(8)?;
        let addr_str: String = row.get(9)?;
        Ok(OrderRecord {
            order_id: row.get(0)?,
            buyer_id: row.get(1)?,
            merchant_id: row.get(2)?,
            supplier_id: row.get(3)?,
            gig_id: row.get(4)?,
            status: row.get(5)?,
            payment_type: row.get(6)?,
            total_amount: row.get(7)?,
            items: serde_json::from_str(&items_str).unwrap_or(json!([])),
            delivery_address: serde_json::from_str(&addr_str).unwrap_or(json!({})),
            captured_at: row.get(10)?,
        })
    });

    let mut list = Vec::new();
    if let Ok(r_iter) = rows {
        for item in r_iter.flatten() {
            list.push(item);
        }
    }

    (StatusCode::OK, Json(json!(list)))
}

async fn handle_inbound_sync(
    State(state): State<AppState>,
    Json(payload): Json<InboundSyncRequest>,
) -> impl IntoResponse {
    info!(
        doc_id = %payload.id,
        collection = %payload.collection,
        change_type = %payload.change_type,
        "Applying inbound mutation from Firebase Bridge into local SQLite"
    );

    let conn = match state.pool.get() {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Database error", "details": e.to_string() })),
            )
        }
    };

    // If change is on an Order document, upsert into SQLite
    if payload.collection == "Orders" {
        let status = payload
            .data
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("UPDATED");

        let _ = conn.execute(
            "UPDATE orders SET status = ?1, updated_at = datetime('now') WHERE order_id = ?2",
            rusqlite::params![status, payload.id],
        );
    }

    (StatusCode::OK, Json(json!({ "status": "acknowledged", "id": payload.id })))
}

