use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutboxEvent {
    pub id: String,
    pub service: String,
    pub aggregate_type: String,
    pub aggregate_id: String,
    pub operation: String,
    pub payload: serde_json::Value,
    pub firestore_collection: String,
    pub created_at: DateTime<Utc>,
    pub synced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ClientContext {
    pub user_uid: Option<String>,
    pub user_role: Option<String>,
    pub client_platform: Option<String>,
    pub correlation_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BridgeBatchRequest {
    pub events: Vec<OutboxEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BridgeBatchResponse {
    pub status: String,
    #[serde(rename = "syncedCount")]
    pub synced_count: usize,
    #[serde(rename = "failedCount")]
    pub failed_count: usize,
    #[serde(rename = "syncedIds")]
    pub synced_ids: Vec<String>,
}

