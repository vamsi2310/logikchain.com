# Logikchain Work Management & Microservices Engineering Framework

Welcome to the **Logikchain Work Management & Engineering Specification Repository**. This directory establishes the industry-standard product-to-engineering framework for Logikchain, fully aligned with the **Domain-Driven Microservices Architecture**, **Database-Per-Service Encapsulation**, and **Multi-Client Execution Models** (Web PWA, Android Native, iOS Native).

---

## 1. Architectural Taxonomy & Work Hierarchy

Logikchain organizes work into a strictly typed, 4-tier hierarchy to ensure end-to-end traceability from architectural functional areas down to independent integration, DevOps, documentation, and automated test implementation:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        EPIC (EPIC-XX)                                  │
│   Functional Area strictly aligned 1:1 with Backend Microservice       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      FEATURE (FEAT-XX.YY)                              │
│   Functional feature derived from one or more concrete Use Cases       │
│   (Preconditions · Nominal Flows · Alternate Paths · Postconditions)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌───────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
│ BACKEND & INTEGRATION │ │  MULTI-CLIENT APPS (CODE) │ │ DEVOPS, PWA CLOUD TESTING │
│ · US-XX.YY.ZZ (Journeys)│ │ · PWA-XX.YY.01 (Web PWA)  │ │ · OPS-XX.YY.ZZ (Docker/K8s)│
│ · INT-XX.YY.ZZ (APIs) │ │ · AND-XX.YY.01 (Android)  │ │ · TEST-XX.YY.PWA (GCP E2E)│
│ · DB, Firebase, Gw    │ │ · IOS-XX.YY.01 (iOS)      │ │ · DOC-XX.YY.ZZ (OpenAPI)  │
└───────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
```

### Hierarchy Numbering Standard

| Level | Notation | Example | Description |
| :--- | :--- | :--- | :--- |
| **Epic** | `EPIC-XX` | `EPIC-02` | Functional Area mapped 1:1 to a Microservice or Gateway platform module. |
| **Feature** | `FEAT-XX.YY` | `FEAT-02.01` | Functional capability derived from one or more concrete business Use Cases (`UC-XX.YY.A`). |
| **Use Case** | `UC-XX.YY.A` | `UC-02.01.A` | Formal business use case with Actors, Pre-conditions, Flows, and Post-conditions. |
| **User Journey Story** | `US-XX.YY.ZZ` | `US-02.01.01` | Role-centric user journey story with Given-When-Then acceptance criteria. |
| **Integration Story** | `INT-XX.YY.ZZ` | `INT-02.01.01` | Independent deliverable for inter-service, Firebase, or external API integrations. |
| **PWA Client Story** | `PWA-XX.YY.01` | `PWA-02.01.01` | Web PWA implementation (`web/`) with offline cache, responsive layout, and API calls. |
| **Android Client Story**| `AND-XX.YY.01` | `AND-02.01.01` | Native Android implementation (`android/`) with Jetpack Compose & Play Integrity. |
| **iOS Client Story** | `IOS-XX.YY.01` | `IOS-02.01.01` | Native iOS implementation (`ios/`) with SwiftUI, URLSession, and DeviceCheck. |
| **PWA Cloud Test Story**| `TEST-XX.YY.PWA`| `TEST-02.01.PWA`| E2E test story validating PWA against microservices deployed on Google Cloud test project. |
| **DevOps Story** | `OPS-XX.YY.ZZ` | `OPS-02.01.01` | Independent deliverable for Docker, K8s, migrations, health probes, and CI/CD. |
| **Documentation Story**| `DOC-XX.YY.ZZ` | `DOC-02.01.01` | Independent deliverable for OpenAPI contracts, sequence flows, and runbooks. |
| **Automation Test Story**| `TEST-XX.YY.ZZ` | `TEST-02.01.01`| Independent deliverable for Bruno API test collections, Unit & E2E test suites. |

---

## 2. Feature Specification Standard (Definition of Ready)

Every feature in Logikchain MUST be documented using the following 7-part structure before engineering commences:

1. **Metadata & Hierarchy**:
   - Epic ID, Feature ID, Functional Area, Bound Microservice, Port, Database, Official Client Runtimes (Web PWA, Android, iOS), Constitution Screen references, and Target API Endpoints.
2. **Derived Use Cases (`UC-XX.YY.A`)**:
   - Explicit operational friction being solved and KPI impact.
   - Primary and Secondary Actors.
   - Pre-conditions & State Prerequisites.
   - Nominal / Happy Path Flow.
   - Alternate, Degraded & Offline Handling.
   - Post-conditions & Side Effects (DB commits, Outbox events, Ledger writes).
3. **Agile User Journey Stories (`US-XX.YY.ZZ`)**:
   - Role-based user journey statements (`As a [persona], I want [action] so that [business outcome]`).
   - Detailed Gherkin Acceptance Criteria (Given-When-Then).
4. **Integration Stories (`INT-XX.YY.ZZ`)**:
   - **Inter-Service Integrations**: Synchronous REST/gRPC or asynchronous Outbox event integration with other microservices.
   - **Firebase Integrations**: Independent periodic synchronization with Cloud Firestore (`/collections`), Firebase Cloud Storage (`/media`), and Firebase Auth custom claims.
   - **External Third-Party Integrations**: Payment Gateways (Razorpay UPI, Webhooks), Google Maps APIs (Geocoding, Distance Matrix), Google Cloud KMS, Google Cloud Tasks, NPCI TPAP interface.
5. **Multi-Client Implementation Stories**:
   - **PWA Client (`PWA-XX.YY.01`)**: Web PWA UI implementation in `web/` with responsive design, service worker caching, and REST/Gateway communication.
   - **Android Client (`AND-XX.YY.01`)**: Native Android UI in `android/` with Jetpack Compose, Play Integrity attestation, and local SQLite/Room caching.
   - **iOS Client (`IOS-XX.YY.01`)**: Native iOS UI with SwiftUI, DeviceCheck attestation, and Apple design guidelines.
6. **PWA Cloud Testing Story (`TEST-XX.YY.PWA`)**:
   - Automated and manual testing on the Web PWA client directly communicating with the microservices deployed on the Google Cloud test project (`logikchain-test`).
7. **Deployment & Cloud Verification (Commands & Acceptance Criteria)**:
   - **Microservice Cloud Run Deployment Commands**:
     ```bash
     # 1. Build and tag microservice image
     docker build -t asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/<service-name>:latest -f microservices/services/<service-name>/Dockerfile.service .
     # 2. Push to Google Artifact Registry
     docker push asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/<service-name>:latest
     # 3. Deploy to Google Cloud Run (internal VPC)
     gcloud run deploy <service-name> \
       --image=asia-south1-docker.pkg.dev/logikchain-test/logikchain-microservices/<service-name>:latest \
       --region=asia-south1 \
       --project=logikchain-test \
       --platform=managed \
       --no-allow-unauthenticated \
       --ingress=internal
     ```
   - **Web PWA Deployment Commands**:
     ```bash
     # 1. Compile PWA in test mode (configured with test project backend endpoints)
     npm --prefix web run build:test
     # 2. Deploy PWA bundle to Firebase Hosting on test project
     firebase deploy --project test --only hosting --non-interactive
     ```
   - **PWA Test Execution Command against Cloud Test Project**:
     ```bash
     # Execute automated Playwright E2E test suite against cloud-hosted PWA & test microservices
     npx playwright test tests/e2e/pwa/<feature-test>.spec.ts --project=test --config=playwright.pwa.config.ts
     ```

---

## 3. Platform Quality Gates & Definition of Done (DoD)

A story or feature is considered **Done** only when:
- [ ] **Contract Compliance**: Verified against `constitution/Logikchain_API_Specifications.md` and Microservice OpenAPI contracts.
- [ ] **Encapsulation Invariance**: Strict Database-Per-Service maintained. No cross-service database access; all cross-domain communication routes via internal APIs or asynchronous outbox event streams.
- [ ] **Zero-Trust Perimeter**: API Gateway enforces Firebase App Check (reCAPTCHA Enterprise, Play Integrity, DeviceCheck) and validates Firebase Auth Bearer tokens.
- [ ] **Multi-Client Verification**: Validated across Web PWA, Android Native, and iOS Native runtime environments with dedicated client stories.
- [ ] **Microservices Deployed on Test Project**: Bound microservices built, pushed to Artifact Registry, and deployed to Google Cloud Run in `logikchain-test`.
- [ ] **Web PWA Deployed on Test Project**: Web PWA built in test mode and deployed to Firebase Hosting in `logikchain-test`.
- [ ] **PWA Cloud Testing Verified**: Automated E2E test runs executed on the live PWA URL against deployed test microservices with 100% assertions passing.
- [ ] **Automated API Testing**: Bruno automated test suite passes with 100% assertions (`tests/bruno/<service>/`).
- [ ] **Unit & Branch Coverage**: Domain services and state transition logic achieve $\ge 90\%$ branch test coverage.
- [ ] **Independent Sync Engine**: Periodic outbox syncer successfully synchronizes local PostgreSQL state with Cloud Firestore and Firebase Cloud Storage.
- [ ] **Financial Double-Entry Invariance**: Ledger debits equal credits ($Debit = Credit$, zero phantom money).
- [ ] **Idempotency & Replay Protection**: Enforced on all mutating endpoints via client-supplied `idempotencyKey` and `capturedAt` headers.
- [ ] **DevOps Artifacts**: Dockerfile builds cleanly, Kubernetes manifests pass validation, and `GET /health` returns status `200 OK`.

---

## 4. Master Epic Directory (Functional Areas & Microservices)

| Epic ID | Functional Area & Domain | Microservice | Port | Database | Primary Runtimes | Epic File Reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EPIC-01** | Identity, Authentication & Role Lifecycle | `identity-service` | `4001` | `identity_db` | Web PWA, Android, iOS | [EPIC-01-IDENTITY-ACCESS.md](./EPIC-01-IDENTITY-ACCESS.md) |
| **EPIC-02** | Orders & Commerce Fulfillment | `orders-service` | `4002` | `orders_db` | Web PWA, Android, iOS | [EPIC-02-ORDERS-FULFILLMENT.md](./EPIC-02-ORDERS-FULFILLMENT.md) |
| **EPIC-03** | Gig Logistics, Fleet Dispatch & Routing | `gigs-service` | `4003` | `gigs_db` | Android (Official), Web, iOS | [EPIC-03-GIG-LOGISTICS.md](./EPIC-03-GIG-LOGISTICS.md) |
| **EPIC-04** | Pamphlet & Dynamic Inventory Distribution | `pamphlet-service` | `4004` | `pamphlet_db` | Android (Official), Web | [EPIC-04-PAMPHLET-INVENTORY.md](./EPIC-04-PAMPHLET-INVENTORY.md) |
| **EPIC-05** | Payments, UPI & Collections | `payments-service` | `4005` | `payments_db` | Web PWA, Android, iOS | [EPIC-05-PAYMENTS-COLLECTIONS.md](./EPIC-05-PAYMENTS-COLLECTIONS.md) |
| **EPIC-06** | Payouts & Disbursements | `payouts-service` | `4006` | `payouts_db` | Web Support Console, Android | [EPIC-06-PAYOUTS-DISBURSEMENTS.md](./EPIC-06-PAYOUTS-DISBURSEMENTS.md) |
| **EPIC-07** | Cash Management & Rural CoD Custody | `cash-service` | `4007` | `cash_db` | Android (Official), Web PWA | [EPIC-07-CASH-CUSTODY.md](./EPIC-07-CASH-CUSTODY.md) |
| **EPIC-08** | Merchant Credit & Risk Underwriting | `credit-service` | `4008` | `credit_db` | Android (Preferred), Web | [EPIC-08-MERCHANT-CREDIT.md](./EPIC-08-MERCHANT-CREDIT.md) |
| **EPIC-09** | Financial Ledger, Tax & Reconciliation | `finance-service` | `4009` | `finance_db` | Web Support Console | [EPIC-09-FINANCE-RECONCILIATION.md](./EPIC-09-FINANCE-RECONCILIATION.md) |
| **EPIC-10** | Master Configuration, Geo-Hierarchy & Plans | `config-service` | `4010` | `config_db` | Web Support Console, Web PWA | [EPIC-10-PLATFORM-CONFIG.md](./EPIC-10-PLATFORM-CONFIG.md) |
| **EPIC-11** | Platform Governance, Compliance & AML | `governance-service`| `4011` | `governance_db`| Web Support Console | [EPIC-11-PLATFORM-GOVERNANCE.md](./EPIC-11-PLATFORM-GOVERNANCE.md) |
| **EPIC-12** | API Gateway & Bidirectional Data Sync Engine | `gateway` & `sync-engine` | `8080` / `4050` | `sync_db` | All Platforms & Infrastructure | [EPIC-12-GATEWAY-SYNC-INFRASTRUCTURE.md](./EPIC-12-GATEWAY-SYNC-INFRASTRUCTURE.md) |
| **EPIC-13** | Social Media Connect & Interaction Orchestrator | `social-connect-service` | `4012` | `social_connect_db` | WhatsApp, FCM Push, SMS, Web, Mobile | [EPIC-13-SOCIAL-CONNECT.md](./EPIC-13-SOCIAL-CONNECT.md) |

---

## 5. Architectural Traceability & Dependency Graphs

- **Interactive HTML Dependency Visualizer**: Open [dependency_graph.html](./dependency_graph.html) for the interactive pan/zoom DAG, real-time node dependency isolation, critical path roadmap, and circuit breaker inspector.
- **Master Epic & Feature Dependency Graph**: See [DEPENDENCY-GRAPH.md](./DEPENDENCY-GRAPH.md) for full visual Mermaid DAGs, execution sequencing, critical path phases, and operational circuit breakers.
- **Service Traceability**: Every microservice in [`microservices/services`](../microservices/services/) maps directly to an Epic, ensuring unified tracking across product management, backend microservices, DevOps orchestration, and quality assurance.


