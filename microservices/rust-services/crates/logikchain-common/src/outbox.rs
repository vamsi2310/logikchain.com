use crate::db::DbPool;
use crate::models::{BridgeBatchRequest, BridgeBatchResponse, OutboxEvent};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, info, warn};

#[derive(Clone)]
pub struct OutboxWorker {
    pool: DbPool,
    bridge_url: String,
    batch_size: usize,
    interval: Duration,
    client: reqwest::Client,
}

impl OutboxWorker {
    pub fn new(pool: DbPool, bridge_url: String, interval_ms: u64, batch_size: usize) -> Self {
        Self {
            pool,
            bridge_url,
            batch_size,
            interval: Duration::from_millis(interval_ms),
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap_or_default(),
        }
    }

    pub fn start(self: Arc<Self>) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(self.interval);
            info!(
                bridge_url = %self.bridge_url,
                interval_ms = self.interval.as_millis(),
                "Started transactional outbox background worker"
            );

            loop {
                ticker.tick().await;

                if let Err(err) = self.flush_batch().await {
                    warn!(error = %err, "Outbox flush cycle encountered an error, will retry next tick");
                }
            }
        })
    }

    pub async fn flush_batch(&self) -> anyhow::Result<usize> {
        // 1. Fetch pending events from SQLite
        let events = {
            let conn = self.pool.get()?;
            let mut stmt = conn.prepare(
                "SELECT id, service, aggregate_type, aggregate_id, operation, payload, firestore_collection, created_at
                 FROM outbox_events
                 WHERE synced_at IS NULL
                 ORDER BY created_at ASC
                 LIMIT ?1",
            )?;

            let rows = stmt.query_map([self.batch_size], |row| {
                let payload_str: String = row.get(5)?;
                let payload: serde_json::Value =
                    serde_json::from_str(&payload_str).unwrap_or(serde_json::Value::Null);

                let created_at_str: String = row.get(7)?;
                let created_at = DateTime::parse_from_rfc3339(&created_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                Ok(OutboxEvent {
                    id: row.get(0)?,
                    service: row.get(1)?,
                    aggregate_type: row.get(2)?,
                    aggregate_id: row.get(3)?,
                    operation: row.get(4)?,
                    payload,
                    firestore_collection: row.get(6)?,
                    created_at,
                    synced_at: None,
                })
            })?;

            let mut list = Vec::new();
            for r in rows {
                list.push(r?);
            }
            list
        };

        if events.is_empty() {
            return Ok(0);
        }

        let total_count = events.len();

        // 2. Stream to Firebase Sync Bridge
        let endpoint = format!("{}/v1/bridge/outbox", self.bridge_url);
        let response = self
            .client
            .post(&endpoint)
            .json(&BridgeBatchRequest { events })
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            error!(status = %status, body = %body, "Firebase Bridge rejected outbox batch");
            anyhow::bail!("Bridge returned status {}: {}", status, body);
        }

        let bridge_res: BridgeBatchResponse = response.json().await?;

        // 3. Update synced_at in SQLite for acknowledged event IDs
        if !bridge_res.synced_ids.is_empty() {
            let conn = self.pool.get()?;
            let mut update_stmt = conn.prepare(
                "UPDATE outbox_events 
                 SET synced_at = datetime('now') 
                 WHERE id = ?1",
            )?;

            for id in &bridge_res.synced_ids {
                update_stmt.execute([id])?;
            }

            info!(
                synced_count = bridge_res.synced_count,
                failed_count = bridge_res.failed_count,
                "Outbox batch successfully committed to Cloud Firestore via Bridge"
            );
        }

        Ok(total_count)
    }
}

