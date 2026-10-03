# EPIC-12: API Gateway & Bidirectional Data Sync Infrastructure

## 1. Functional Area Alignment & Platform Metadata
- **Epic ID**: `EPIC-12`
- **Epic Status**: `[IN_PROGRESS]`
- **Functional Area**: API Gateway Perimeter, Multi-Client Ingress & Bidirectional Data Sync Engine
- **Bound Platform Modules**: `microservices/services/gateway` & `microservices/devops/docker/Dockerfile.sync-engine`
- **Container Ports**: `gateway` on `:8080` / `sync-engine` on `:4050`
- **Database**: `sync_db` (PostgreSQL sync checkpoints & replication journal)
- **Primary Runtimes**: Edge Reverse Proxy, Background CDC Worker, Kubernetes Cluster Ingress
- **Primary Responsibilities**: Client perimeter security, Firebase App Check attestation (reCAPTCHA Enterprise, Google Play Integrity, Apple DeviceCheck), Firebase Auth token verification, internal header injection (`x-user-uid`, `x-user-role`), rate limiting (300 req/min), Change Data Capture (CDC) PostgreSQL outbox replication to Cloud Firestore, Firebase Cloud Storage media streaming, and mobile offline outbox ingestion.

---

## FEAT-12.01: Unified API Gateway & Multi-Client Protocol Ingress

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-12.01`
- **Feature Status**: `[IN_PROGRESS]`
- **Functional Scope**: Perimeter reverse proxy, internal VPC microservice routing, client context header injection, and rate limiting.
- **Service Endpoints**: `ALL /v1/*` (Proxy Router), `GET /health` (Gateway Health)
- **UI Screens**: Platform Perimeter (All Client Applications: PWA, Android, iOS)

### 2. Derived Use Cases
#### UC-12.01.A: Secure Perimeter Ingress & Internal VPC Routing
- **Description**: Web, Android, and iOS clients send requests to the API Gateway; the gateway terminates SSL, verifies identity, injects trusted headers, and dispatches traffic over internal VPC.
- **Primary Actor**: Client Applications (Web PWA, Android App, iOS App).
- **Secondary Systems**: API Gateway (:8080), Downstream Microservices (:4001–:4011).
- **Preconditions**: Client initiates HTTPS request with Authorization token and App Check attestation.
- **Nominal Flow**:
  1. Client sends request to `https://api.logikchain.com/v1/orders`.
  2. Gateway inspects client platform header `X-Client-Platform` (`web`, `android`, or `ios`).
  3. Gateway applies IP/User rate limiting (max 300 requests/minute).
  4. Gateway verifies Firebase Auth ID token and decodes UID and custom claims.
  5. Gateway injects internal trusted headers: `x-user-uid`, `x-user-role`, `x-client-platform`, `x-client-version`.
  6. Gateway strips public client authorization headers and routes to internal service `http://orders-service:4002/v1/orders`.
  7. Downstream microservice processes request with zero external security overhead.
  8. Gateway streams response back to client.
- **Alternate / Degraded Flow**:
  - *Rate Limit Exceeded*: Gateway returns HTTP 429 Too Many Requests with `Retry-After` header.
- **Postconditions**: Request authenticated and forwarded; clients isolated from internal microservices.

### 3. User Journey Stories
- **US-12.01.01 [READY]**: *As a mobile/web developer, I want a single unified API endpoint (`api.logikchain.com`), so that client applications do not need complex multi-host network configurations.*
- **US-12.01.02 [READY]**: *As an infrastructure security engineer, I want internal microservices completely isolated within a private VPC, so that unauthorized internet traffic cannot reach internal databases directly.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Gateway injects validated identity headers to downstream service
  Given an incoming request to "/v1/orders" with valid Firebase Bearer token for uid "usr_10"
  When the API Gateway routes the request
  Then it forwards to internal host "http://orders-service:4002/v1/orders"
  And injects header "x-user-uid: usr_10" and "x-user-role: buyer"
```

### 4. Integration Stories
- **INT-12.01.01 [IN_PROGRESS] (Internal VPC Service Dispatch Integration)**: *As the API Gateway, I need to maintain dynamic DNS service discovery to route incoming path prefixes (`/v1/orders/*`, `/v1/gigs/*`, etc.) to their respective microservices across the Kubernetes cluster.*
- **INT-12.01.02 [READY] (Redis Rate Limiting Integration)**: *As the API Gateway, I need to integrate with a Redis cluster to enforce a strict 300 requests/minute sliding-window rate limit per client IP and user UID.*

### 5. Multi-Client Implementation Stories
- **PWA-12.01.01 [IN_PROGRESS] (Web PWA Gateway HTTP Client & Header Interceptor)**: *Implement centralized HTTP client in `web/` with automatic Bearer token injection, retry on network drops, and global 401 handling.*
- **AND-12.01.01 [IN_PROGRESS] (Android Native OkHttp Gateway Client)**: *Implement Retrofit/OkHttp network stack in `android/` with automatic token refresh, device attestation headers, and offline error interception.*
- **IOS-12.01.01 [READY] (iOS Native URLSession Gateway Client)**: *Implement URLSession network client in `ios/` with token refresh interceptor and structured error handling.*

### 6. PWA Cloud Testing Story
- **TEST-12.01.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test asserting API Gateway routing, identity header forwarding, and rate limiting on live PWA against `gateway` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-12.01.01 [IN_PROGRESS] (DevOps & Gateway Docker/K8s)**: *Deploy API Gateway using multi-stage Docker build (`microservices/services/gateway/Dockerfile`), configure Kubernetes Ingress controller with TLS certificates, and set HPA autoscaling based on CPU/traffic.*
- **DOC-12.01.01 [READY] (Gateway Architecture & Route Table)**: *Publish master API Gateway routing table, header injection specification, and error handling taxonomy in platform documentation.*
- **TEST-12.01.01 [READY] (Gateway Benchmark & Load Test)**: *Build automated load test using k6/Autocannon asserting sub-10ms gateway routing overhead under 5,000 concurrent connections.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gateway:latest -f microservices/devops/docker/Dockerfile.gateway microservices/services/gateway
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gateway:latest
  gcloud run deploy gateway \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gateway:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --allow-unauthenticated
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/gateway-ingress-routing.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Gateway container running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-12.02: Firebase App Check Zero-Trust Perimeter Attestation

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-12.02`
- **Feature Status**: `[IN_PROGRESS]`
- **Functional Scope**: Multi-platform hardware-backed device attestation verification: reCAPTCHA Enterprise (PWA), Play Integrity (Android), and DeviceCheck/App Attest (iOS).
- **Service Endpoints**: Ingress Middleware on API Gateway
- **UI Screens**: All Client Application Ingress

### 2. Derived Use Cases
#### UC-12.02.A: Zero-Trust Hardware Device Attestation Verification
- **Description**: Gateway verifies that incoming requests originate from genuine, untampered Logikchain applications running on authentic hardware.
- **Primary Actor**: Client Applications (Web PWA, Android App, iOS App).
- **Secondary Systems**: API Gateway, Firebase App Check Admin SDK.
- **Preconditions**: Client includes `X-Firebase-AppCheck` header containing attestation token.
- **Nominal Flow**:
  1. Client sends API request with `X-Firebase-AppCheck: <token>`.
  2. Gateway App Check middleware intercepts request before route processing.
  3. Middleware calls `admin.appCheck().verifyToken(token)`.
  4. Token verified: Confirms authentic binary (Android Play Integrity signature, iOS DeviceCheck, or Web reCAPTCHA Enterprise score $\ge 0.7$).
  5. Gateway forwards request downstream.
- **Alternate / Degraded Flow**:
  - *Missing or Forged Token*: Gateway immediately rejects request with HTTP 401 Unauthorized (`APP_CHECK_INVALID`); logs security probe incident.
- **Postconditions**: Script kiddies, bots, and emulated API scrapers blocked at network perimeter.

### 3. User Journey Stories
- **US-12.02.01 [READY]**: *As a platform architect, I want all non-browser bots and script injections blocked by Firebase App Check, so that malicious actors cannot scrape pricing or flood backend microservices.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Bot without App Check token rejected at perimeter
  Given an incoming POST request to "/v1/orders" without header "X-Firebase-AppCheck"
  When the request hits the API Gateway
  Then the gateway returns status 401 Unauthorized
  And response contains "error: 'APP_CHECK_FAILED'"
  And the request is NEVER forwarded to the orders microservice
```

### 4. Integration Stories
- **INT-12.02.01 [IN_PROGRESS] (Firebase App Check SDK Integration)**: *As the API Gateway, I need to integrate with the Firebase Admin App Check SDK to validate cryptographic attestation tokens for Web, Android, and iOS runtimes.*
- **INT-12.02.02 [READY] (Governance Security Alert Integration)**: *As the API Gateway, I need to stream App Check failure spikes to `governance-service` (`:4011`) for DDoS and bot mitigation.*

### 5. Multi-Client Implementation Stories
- **PWA-12.02.01 [IN_PROGRESS] (Web PWA reCAPTCHA Enterprise Attestation)**: *Initialize Firebase App Check in `web/` using reCAPTCHA Enterprise provider with automatic token refresh on network requests.*
- **AND-12.02.01 [IN_PROGRESS] (Android Native Play Integrity Attestation)**: *Configure Firebase App Check Play Integrity provider in `android/` with hardware-backed tamper detection.*
- **IOS-12.02.01 [READY] (iOS Native DeviceCheck Attestation)**: *Configure Firebase App Check App Attest / DeviceCheck provider in `ios/`.*

### 6. PWA Cloud Testing Story
- **TEST-12.02.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test validating that PWA requests with valid reCAPTCHA App Check tokens succeed while requests with missing/invalid tokens are rejected with 401 on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-12.02.01 [IN_PROGRESS] (App Check Local Emulator Bypass)**: *Configure debug token bypass mechanisms in development environments (`NODE_ENV=development`) to facilitate local Bruno API and Playwright automated testing.*
- **DOC-12.02.01 [READY] (App Check Configuration Manual)**: *Document registration of Play Integrity SHA-256 fingerprints, iOS Team IDs, and reCAPTCHA Enterprise site keys.*
- **TEST-12.02.01 [READY] (Automated Test Suite)**: *Build test in `tests/bruno/00-gateway/appCheck/` testing valid vs invalid vs missing App Check tokens.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gateway:latest -f microservices/devops/docker/Dockerfile.gateway microservices/services/gateway
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gateway:latest
  gcloud run deploy gateway \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/gateway:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --allow-unauthenticated
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/gateway-appcheck.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Gateway container running on Google Cloud Run in `logikchain-test` with `200 OK` on `/health`.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` communicating through API Gateway.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-12.03: Bidirectional Microservice-to-Firestore CDC Sync Engine

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-12.03`
- **Feature Status**: `[READY]`
- **Functional Scope**: PostgreSQL transactional outbox polling, Change Data Capture (CDC), batch commits to Cloud Firestore collections, and real-time offline mutation ingestion.
- **Service Endpoints**: `GET /sync/status` (Health/Metrics), `POST /sync/trigger` (Manual Flush)
- **UI Screens**: Infrastructure Background Worker

### 2. Derived Use Cases
#### UC-12.03.A: Asynchronous PostgreSQL Outbox to Cloud Firestore Replication
- **Description**: Microservices commit state changes and outbox events within a single PostgreSQL transaction; sync engine worker replicates events into Cloud Firestore for low-latency client reads.
- **Primary Actor**: Sync Engine Worker (`sync-engine` :4050) and Periodic Microservice Syncers.
- **Secondary Systems**: Microservice PostgreSQL Databases, Cloud Firestore.
- **Preconditions**: Microservice has written un-synced events into its `outbox_events` table.
- **Nominal Flow**:
  1. Syncer polls local `outbox_events` where `synced_at IS NULL` (polling interval: 2000ms).
  2. Fetches batch of up to 100 pending events.
  3. Opens Firestore batch write; maps domain payload into target Firestore collection doc (`/Orders/{id}`, `/Gigs/{id}`, `/UserProfiles/{id}`).
  4. Commits Firestore batch atomically.
  5. Updates PostgreSQL `outbox_events` setting `synced_at = NOW()`.
  6. Increments Prometheus metrics counters.
- **Alternate / Degraded Flow**:
  - *Firestore Network Failure*: Worker pauses; applies exponential backoff; leaves `synced_at` as NULL to ensure zero data loss (At-Least-Once Delivery).
- **Postconditions**: PostgreSQL state mirrored in Cloud Firestore; mobile and web clients receive real-time document snapshots.

### 3. User Journey Stories
- **US-12.03.01 [READY]**: *As a rural user with intermittent internet, I want my app to read data from Firestore's local cache instantly, while the backend sync engine ensures the data is always up-to-date with the PostgreSQL master database.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Outbox event commits to Cloud Firestore within 2 seconds
  Given an outbox event created in "orders_db.outbox_events" for order "ord_777"
  When the periodic syncer executes its polling cycle
  Then the document "/Orders/ord_777" is written in Cloud Firestore
  And the outbox row is updated with a non-null synced_at timestamp
```

### 4. Integration Stories
- **INT-12.03.01 [READY] (PostgreSQL Outbox Stream Integration)**: *As the Sync Engine, I need to connect to all microservice PostgreSQL outbox tables to poll and process pending replication events.*
- **INT-12.03.02 [READY] (Cloud Firestore Batch Write Integration)**: *As the Sync Engine, I need to utilize Firestore Admin SDK batch operations to minimize API operations and maintain write atomicity.*
- **INT-12.03.03 [READY] (Firestore Inbound Snapshot Listener Integration)**: *As the Sync Engine, I need to listen to incoming offline mutations committed by mobile clients in Firestore `/outbox_mobile/` and ingest them into PostgreSQL with idempotency checks.*

### 5. Multi-Client Implementation Stories
- **PWA-12.03.01 [READY] (Web PWA Firestore Realtime Listener Client)**: *Implement Firestore snapshot listeners in `web/` subscribing to synchronized collections with automatic reconciliation on reconnect.*
- **AND-12.03.01 [READY] (Android Native Offline Outbox & Firestore Sync)**: *Implement Android offline Firestore outbox queue in `android/` writing to `/outbox_mobile/` during cellular outages.*
- **IOS-12.03.01 [READY] (iOS Native Offline Outbox & Firestore Sync)**: *Implement iOS offline Firestore outbox queue in `ios/` with automatic batch flush.*

### 6. PWA Cloud Testing Story
- **TEST-12.03.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test creating an order in PostgreSQL, waiting 2000ms, and verifying real-time Firestore listener update on PWA against `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-12.03.01 [READY] (Sync Engine Docker & Daemon Deployment)**: *Build production image using `microservices/devops/docker/Dockerfile.sync-engine` and deploy as a Kubernetes DaemonSet / StatefulSet with dedicated database pool.*
- **DOC-12.03.01 [READY] (Data Replication Architecture Spec)**: *Publish CDC replication architecture documentation detailing at-least-once delivery guarantees and conflict resolution strategies.*
- **TEST-12.03.01 [READY] (Automated Lag & Failure Tests)**: *Build automated test in `tests/integration/sync/` verifying replication lag remains under 2000ms under 500 events/second load.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/sync-engine:latest -f microservices/devops/docker/Dockerfile.sync-engine microservices/services/gateway
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/sync-engine:latest
  gcloud run deploy sync-engine \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/sync-engine:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/sync-engine-cdc.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Sync engine container running in `logikchain-test` replicating outbox rows to Firestore within 2000ms.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` receiving live Firestore updates.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.

---

## FEAT-12.04: Firebase Cloud Storage Media Synchronization

### 1. Feature Metadata & Hierarchy
- **Feature ID**: `FEAT-12.04`
- **Feature Status**: `[READY]`
- **Functional Scope**: Delivery photo uploads, KYC document sync, TDS challan PDFs, and Cloud Storage signed URL generation.
- **Service Endpoints**: `POST /v1/storage/upload-ticket`, `GET /sync/storage/status`
- **UI Screens**: Infrastructure Background Pipeline

### 2. Derived Use Cases
#### UC-12.04.A: Secure Binary Media Upload & Bucket Synchronization
- **Description**: Delivery drivers upload delivery proof photos or KYC scans; service issues time-limited signed upload URLs and synchronizes metadata.
- **Primary Actor**: Client Applications (Android Driver, Support Operator).
- **Secondary Systems**: API Gateway, `sync-engine`, Firebase Cloud Storage Bucket.
- **Nominal Flow**:
  1. Client calls `POST /v1/storage/upload-ticket` specifying file type, MIME type, and content length.
  2. Gateway/Sync-Engine validates file permissions and generates a V4 signed upload URL for Firebase Cloud Storage (valid for 15 minutes).
  3. Client uploads binary payload directly to Cloud Storage via HTTP PUT.
  4. Client notifies service with storage path; service logs record in `storage_sync_events`.
  5. Sync engine verifies object existence and registers permanent CDN URL.
- **Postconditions**: File stored securely in Google Cloud Storage; public access restricted; reference linked to domain record.

### 3. User Journey Stories
- **US-12.04.01 [READY]**: *As a delivery driver taking delivery proof photos, I want uploads to complete quickly and reliably even over 3G rural networks, so that I can proceed to the next delivery without waiting.*

#### Acceptance Criteria (Gherkin)
```gherkin
Scenario: Generate signed upload URL for delivery photo
  Given an authenticated driver on Android
  When requesting an upload ticket for image "proof.jpg"
  Then the service returns a signed GCS upload URL with a 15-minute expiration
  And client uploads directly to Firebase Cloud Storage without overloading backend services
```

### 4. Integration Stories
- **INT-12.04.01 [READY] (Firebase Cloud Storage SDK Integration)**: *As the Sync Engine, I need to interface with `@google-cloud/storage` / Firebase Admin Storage to generate signed URLs and manage lifecycle retention policies.*
- **INT-12.04.02 [READY] (Microservice Media Metadata Integration)**: *As the Sync Engine, I need to notify calling microservices (`orders-service`, `finance-service`, `pamphlet-service`) once uploaded media is verified.*

### 5. Multi-Client Implementation Stories
- **PWA-12.04.01 [READY] (Web PWA Direct Binary Uploader)**: *Implement direct-to-GCS chunked binary uploader in `web/` with progress bar, compression, and signed URL retrieval.*
- **AND-12.04.01 [READY] (Android Native Camera Photo Direct Uploader)**: *Implement Android camera photo capture, client-side JPEG compression, and direct GCS background upload in `android/`.*
- **IOS-12.04.01 [READY] (iOS Native Camera Photo Direct Uploader)**: *Implement iOS camera photo capture, HEIC/JPEG compression, and direct GCS background upload in `ios/`.*

### 6. PWA Cloud Testing Story
- **TEST-12.04.PWA [READY] (PWA Cloud E2E Test on Test Project)**: *Automated Playwright test requesting upload ticket, uploading test binary to Firebase Cloud Storage, and asserting media URL resolution on PWA against `gateway` on `logikchain-test`.*

### 7. Independent Support Stories
- **OPS-12.04.01 [READY] (Cloud Storage IAM & Bucket DevOps)**: *Configure Terraform scripts for GCS bucket `logikchain-media` with regional dual-region redundancy and CORS policies.*
- **DOC-12.04.01 [READY] (Media Storage Guidelines)**: *Document maximum upload limits (5MB for photos, 10MB for PDFs), allowed MIME types (`image/jpeg`, `application/pdf`), and access control.*
- **TEST-12.04.01 [READY] (Automated Test Suite)**: *Build Bruno automated test `tests/bruno/00-gateway/uploadTicket/` verifying URL signature validity.*

### 8. Deployment & Cloud Verification (Acceptance Criteria & Commands)
- **Cloud Run Microservice Deployment Command**:
  ```bash
  docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/sync-engine:latest -f microservices/devops/docker/Dockerfile.sync-engine microservices/services/gateway
  docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/sync-engine:latest
  gcloud run deploy sync-engine \
    --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/sync-engine:latest \
    --region=asia-south1 \
    --project=logikchain-test \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal
  ```
- **Web PWA Deployment Command**:
  ```bash
  npm --prefix web run build:test
  firebase deploy --project test --only hosting --non-interactive
  ```
- **PWA Cloud Test Verification Command**:
  ```bash
  npx playwright test tests/e2e/pwa/storage-upload-ticket.spec.ts --project=test --config=playwright.pwa.config.ts
  ```
- **Acceptance Criteria**:
  - [ ] Gateway & Sync Engine running in `logikchain-test` with valid Cloud Storage IAM signing credentials.
  - [ ] Web PWA deployed to Firebase Hosting on `logikchain-test` executing direct GCS uploads.
  - [ ] Android & iOS builds compile and connect to `logikchain-test`.
  - [ ] Automated PWA E2E tests pass 100% assertions on test project URL.
