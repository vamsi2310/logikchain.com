# Logikchain Microservices Backend & DevOps

This directory contains the containerized **Microservices Backend** for Logikchain, architected from the functional specifications in [`logikchain_architecture.html`](../work-management/logikchain_architecture.html).

It provides:
1. **Domain-Driven Microservices** with strict **Database-Per-Service** encapsulation.
2. **Unified API Gateway** serving **PWA (Web)**, **Android**, and **iOS** clients with App Check and Firebase Auth verification.
3. **Bidirectional Sync Engine** ensuring all microservice PostgreSQL changes are mirrored in real-time to **Firebase Firestore** and **Firebase Cloud Storage** (and vice-versa for offline mobile outbox queues).
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
    (identity_db)    (orders_db)    (gigs_db)   (pamphlet_db) (payments_db)    (governance_db)
          │               │             │             │             │                 │
          └───────────────┼─────────────┴─────────────┼─────────────┴─────────────────┘
                          ▼                           ▼
                  ┌──────────────────────────────────────────┐
                  │    PostgreSQL Outbox Event Streams       │
                  └─────────────────────┬────────────────────┘
                                        │
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │     Sync Engine (CDC Worker :4050)       │
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

| Service | Port | Database | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **`gateway`** | `8080` | — | Ingress router, rate limiter, verifies App Check (reCAPTCHA / Play Integrity / DeviceCheck). |
| **`identity-service`** | `4001` | `identity_db` | User profiles, role conversion, custom claims (`role`, `status`), suspension. |
| **`orders-service`** | `4002` | `orders_db` | Purchase orders (CoD / prepaid), merchant fulfillment orders, idempotency keys. |
| **`gigs-service`** | `4003` | `gigs_db` | Driver lifecycle, vehicle-keyed Gigs (`{vehicleId}_{startDatetime}`), real-time location. |
| **`pamphlet-service`** | `4004` | `pamphlet_db` | Dynamic stock manifest per Gig, stock load/unload deltas, order linkings. |
| **`payments-service`** | `4005` | `payments_db` | UPI intent/collect flows, PSP HMAC webhook validation, refunds, disputes. |
| **`payouts-service`** | `4006` | `payouts_db` | Driver & supplier payouts, KMS-encrypted beneficiary accounts, transfer queue. |
| **`cash-service`** | `4007` | `cash_db` | Physical cash handover for CoD rural deliveries, 6-digit OTP confirmation. |
| **`credit-service`** | `4008` | `credit_db` | Merchant credit limits, credit approvals, repayments, overdue credit relief. |
| **`finance-service`** | `4009` | `finance_db` | Daily ledger reconciliation, period close, TDS challan & register. |
| **`config-service`** | `4010` | `config_db` | Village hierarchy (Google Maps geocoding), subscription plans, tax profiles. |
| **`governance-service`**| `4011` | `governance_db`| UPI TPAP compliance, AML fraud velocity checks, dispute SLA tracking, audit logs. |
| **`social-connect-service`**| `4012` | `social_connect_db`| User interaction orchestrator: WhatsApp OTPs, notifications, bills & ownership alerts, local preference check & Firestore sync. |
| **`sync-engine`** | `4050` | `sync_db` | Bidirectional synchronization between PostgreSQL and Cloud Firestore / Storage. |

---

## 🔄 Independent Periodic Database & Storage Sync

Each microservice is fully autonomous and **independently connects to Cloud Firestore and Firebase Storage** without bottlenecking through a single service:

1. **Independent Embedded Syncer (`PeriodicServiceSyncer`)**:
   * Every microservice runs its own instance of `createPeriodicSyncer` from `@logikchain/common`.
   * **Outbound Firestore Sync**: Every `SYNC_INTERVAL_MS` (default 2000ms), the service polls its own local `outbox_events` and commits batch updates to its corresponding Firestore collection (`Orders`, `Gigs`, `UserProfiles`, etc.).
   * **Outbound Storage Sync**: Every period, the service syncs binary file records (signatures, KYC, delivery photos, invoices) from `storage_sync_events` directly to Firebase Cloud Storage.
   * **Inbound Real-time Listeners**: Each microservice maintains its own scoped `onSnapshot` listener on its Firestore collection to ingest mutations from offline Android (Room / WorkManager) or PWA clients into PostgreSQL.
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
