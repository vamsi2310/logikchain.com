# Logikchain Microservices Backend & DevOps

This directory contains the containerized **Microservices Backend** for Logikchain, architected from the functional specifications in [`logikchain_architecture.html`](../work-management/logikchain_architecture.html).

It provides:
1. **Domain-Driven Microservices in Rust** with zero-daemon **Embedded SQLite-Per-Service** encapsulation.
2. **Unified API Gateway** serving **PWA (Web)**, **Android**, and **iOS** clients with App Check and Firebase Auth verification.
3. **Firebase Sync Bridge (:4050)** in Node.js using official `firebase-admin`, buffering transactional outboxes from Rust services to **Cloud Firestore** and streaming inbound mobile mutations back into microservice SQLite engines.
4. **Complete DevOps Suite**: Multi-stage production `Dockerfiles`, `docker-compose.yml`, Kubernetes (`k8s/`) manifests, Terraform GCP infrastructure, and CI/CD pipelines.

---

## 🏛️ High-Level System Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                    Client Tier                         │
                    │   • Web PWA (React)   • Android (Kotlin)   • iOS (Swift)│
                    └───────────────────────────┬────────────────────────────┘
                                                │
                          HTTPS / Bearer JWT + X-Firebase-AppCheck
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               API Gateway (Port 8080)                  │
                    │   • Route Dispatch    • Rate Limiting    • App Check   │
                    │   • Client Context    • Platform Header Injection      │
                    └──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┘
                           │      │      │      │      │      │      │
          ┌────────────────┼──────┴──────┼──────┴──────┼──────┴──────┼────────────────┐
          ▼                ▼             ▼             ▼             ▼                ▼
     ┌──────────┐    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    ┌─────────────┐
     │ Identity │    │  Orders  │  │   Gigs   │  │ Pamphlet │  │ Payments │    │ Governance  │
     │  (:4001) │    │  (:4002) │  │  (:4003) │  │  (:4004) │  │  (:4005) │    │   (:4011)   │
     └────┬─────┘    └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    └──────┬──────┘
          │               │             │             │             │                 │
    (identity.db)   (orders.db)    (gigs.db)   (pamphlet.db) (payments.db)    (governance.db)
          │               │             │             │             │                 │
          └───────────────┼─────────────┴─────────────┼─────────────┴─────────────────┘
                          ▼                           ▼
                  ┌──────────────────────────────────────────┐
                  │    SQLite WAL Outbox Event Streams       │
                  └─────────────────────┬────────────────────┘
                                        │
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │   Firebase Sync Bridge (Node.js :4050)   │
                  │   • Replicates Outbox to Firestore       │
                  │   • Listens to Firestore onSnapshot      │
                  │   • Syncs Media to Cloud Storage         │
                  └─────────────────────┬────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 Cloud Firestore            Firebase Cloud Storage
              (Offline Client Sync)           (Images, KYC, PDFs)
```

---

## 📦 Service Registry & Functional Map

| Service | Port | Runtime | Database | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **`gateway`** | `8080` | `Node.js (Express)` | — | Ingress router, rate limiter, verifies App Check (reCAPTCHA / Play Integrity / DeviceCheck). |
| **`identity-service`** | `4001` | **`Rust (Axum)`** | `identity.db (SQLite WAL)` | User profiles, role conversion, custom claims (`role`, `status`), suspension. |
| **`orders-service`** | `4002` | **`Rust (Axum)`** | `orders.db (SQLite WAL)` | Purchase orders (CoD / prepaid), merchant fulfillment orders, idempotency keys. |
| **`gigs-service`** | `4003` | **`Rust (Axum)`** | `gigs.db (SQLite WAL)` | Driver lifecycle, vehicle-keyed Gigs (`{vehicleId}_{startDatetime}`), real-time location. |
| **`pamphlet-service`** | `4004` | **`Rust (Axum)`** | `pamphlet.db (SQLite WAL)` | Dynamic stock manifest per Gig, stock load/unload deltas, order linkings. |
| **`payments-service`** | `4005` | **`Rust (Axum)`** | `payments.db (SQLite WAL)` | UPI intent/collect flows, PSP HMAC webhook validation, refunds, disputes. |
| **`payouts-service`** | `4006` | **`Rust (Axum)`** | `payouts.db (SQLite WAL)` | Driver & supplier payouts, KMS-encrypted beneficiary accounts, transfer queue. |
| **`cash-service`** | `4007` | **`Rust (Axum)`** | `cash.db (SQLite WAL)` | Physical cash handover for CoD rural deliveries, 6-digit OTP confirmation. |
| **`credit-service`** | `4008` | **`Rust (Axum)`** | `credit.db (SQLite WAL)` | Merchant credit limits, credit approvals, repayments, overdue credit relief. |
| **`finance-service`** | `4009` | **`Rust (Axum)`** | `finance.db (SQLite WAL)` | Daily ledger reconciliation, period close, TDS challan & register. |
| **`config-service`** | `4010` | **`Rust (Axum)`** | `config.db (SQLite WAL)` | Village hierarchy (Google Maps geocoding), subscription plans, tax profiles. |
| **`governance-service`**| `4011` | **`Rust (Axum)`** | `governance.db (SQLite WAL)`| UPI TPAP compliance, AML fraud velocity checks, dispute SLA tracking, audit logs. |
| **`social-connect-service`**| `4012` | **`Rust (Axum)`** | `socialConnect.db (SQLite WAL)`| User interaction orchestrator: WhatsApp OTPs, notifications, bills & ownership alerts. |
| **`firebase-bridge`** | `4050` | `Node.js (Express)` | `bridge.db (SQLite WAL)` | Official Firebase Admin bridge between Rust SQLite microservices and Cloud Firestore / Storage. |

---

## 🔄 Microservices-to-Firebase Sync Architecture (Bridge Pattern)

Rust domain microservices execute local transactions against embedded SQLite files with sub-millisecond latency. The **`firebase-bridge`** service (:4050) acts as the single, reliable gateway between Rust services and Firebase:

1. **Rust Transactional Outbox (Outbound)**:
   * Every mutation committed in Rust (orders, gigs, payments) writes both the business entity and an `outbox_events` record within a single SQLite transaction (`WAL` mode).
   * A lightweight background worker in each Rust service streams pending outbox batches to the `firebase-bridge` via internal RPC / fast HTTP (`POST /v1/bridge/outbox`).
   * The Bridge uses official Google `firebase-admin` to commit batch writes (`bulkWriter`) to **Cloud Firestore** and updates sync status.
2. **Inbound Real-time Listeners (Inbound)**:
   * The `firebase-bridge` maintains scoped `onSnapshot` listeners on Firestore collections to capture mutations originating from offline mobile clients (`/outbox_mobile/`).
   * Upon change detection, the Bridge calls the target Rust service's internal webhook (`POST http://<service>:400X/internal/sync-inbound`).
   * The Rust service applies the update using its internal SQLite writer connection, avoiding SQLite file contention and guaranteeing local constraint validation.
3. **Cloud Storage Bridge**:
   * Binary assets (delivery signatures, KYC photos, PDF receipts) are uploaded via pre-signed URLs generated by the Bridge (`POST /v1/bridge/storage/sign-upload`), keeping Rust services free of complex GCP IAM/KMS dependencies.
2. **Observability & Manual Triggers**:
   * Every service exposes `GET /sync/status` returning current sync metrics (last sync time, total synced, errors).
   * Every service exposes `POST /sync/trigger` to force an immediate on-demand synchronization flush.

---

## 📱 Multi-Client Support: PWA, Android, and iOS

The API Gateway inspects client headers on every request:
* `X-Client-Platform`: `web` | `android` | `ios`
* `X-Client-Version`: Version string (e.g. `2.4.0`)
* `X-Firebase-AppCheck`: Attestation token:
  * **PWA**: reCAPTCHA Enterprise
  * **Android**: Google Play Integrity API
  * **iOS**: DeviceCheck / App Attest
* `Authorization`: `Bearer <Firebase_ID_Token>`

Downstream microservices receive pre-validated identity context via internal headers (`x-user-uid`, `x-user-role`, `x-client-platform`).

---

## 🚀 Quickstart & Local Development

### Prerequisites
* Docker & Docker Compose v2+
* Node.js 22+ & npm 10+

### Run with Docker Compose
To launch the entire microservice ecosystem, databases, and sync engine:

```bash
cd microservices
make up
# Or: docker compose up -d
```

### 🔌 Database Backend Connector for Dev Setup
For developers running services individually (e.g., `npm run dev`) or running e2e tests outside Kubernetes, use the automated **DB Backend Connector**:

```powershell
# PowerShell (Windows)
.\devops\scripts\connect-db-dev.ps1 -Action Start    # Auto-connects port 5432 to K8s / Docker / CloudSQL
.\devops\scripts\connect-db-dev.ps1 -Action Status   # Audits health of all 13 databases
.\devops\scripts\connect-db-dev.ps1 -Action Connect -Database orders_db  # Interactive psql shell
.\devops\scripts\connect-db-dev.ps1 -Action Stop     # Stop background connector
```

```bash
# Bash (Linux / macOS / WSL)
./devops/scripts/connect-db-dev.sh start
./devops/scripts/connect-db-dev.sh status
./devops/scripts/connect-db-dev.sh connect orders_db
./devops/scripts/connect-db-dev.sh stop
```

Or via `npm` / `make`:
```bash
npm run db:start     # Start dev DB backend connector
npm run db:status    # Inspect PostgreSQL mesh status
npm run db:connect   # Open interactive psql
# Or: make db-start, make db-status, make db-connect
```

Check the health status of all services:
```bash
curl http://localhost:8080/health
# Response: {"status":"healthy","service":"api-gateway","supportedPlatforms":["web","android","ios"]}
```

Stop containers:
```bash
make down
```

---

## 🛠️ DevOps & Deployment

### 1. Multi-Stage Docker Builds
Build all production images with non-root Alpine containers:
```bash
make build
# Or: bash devops/scripts/build-all.sh
```

### 2. Kubernetes Deployment (`k8s/`)
Deploy to a Kubernetes cluster (GKE, EKS, or Minikube):
```bash
kubectl apply -f devops/k8s/00-namespace.yaml
kubectl apply -f devops/k8s/01-configmaps-secrets.yaml
kubectl apply -f devops/k8s/02-gateway.yaml
kubectl apply -f devops/k8s/03-services.yaml
kubectl apply -f devops/k8s/04-sync-engine.yaml
kubectl apply -f devops/k8s/05-ingress.yaml
```

### 3. Google Cloud Run Deployment
Deploy all containers to managed Cloud Run in `asia-south1`:
```bash
bash devops/scripts/deploy-gcp.sh logikchain-dev asia-south1
```

### 4. Terraform Infrastructure as Code (`terraform/`)
Provision Cloud SQL, Artifact Registry, and Cloud Run infrastructure:
```bash
cd devops/terraform
terraform init
terraform plan -var="project_id=logikchain-dev"
terraform apply -auto-approve
```
