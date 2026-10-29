# Logikchain Platform Deployment Guide

## Overview

This guide provides end-to-end instructions for deploying the **Logikchain Platform**, with specific focus on **EPIC-10: Master Configuration, Geo-Hierarchy & Subscriptions**.

The Logikchain deployment topology is built on Google Cloud Platform (GCP) and Firebase:
- **Backend Microservices**: Node.js 22 containers deployed on **Google Cloud Run** (`asia-south1`).
- **Edge & API Gateway**: Express Gateway with rate limiting, App Check attestation, and Support-as-Supplier proxy context routing.
- **Data Tier**: **Google Cloud SQL** (PostgreSQL 16 with PostGIS spatial extensions) and **Cloud Firestore** read-mirrors synchronized via transactional outbox CDC (2000ms periodic sync).
- **Client Frontend**: Web Progressive Web App (PWA) hosted on **Firebase Hosting** (supporting Support Console and Supplier Portal).
- **CI/CD Automation**: **Google Cloud Build** YAML pipelines pushing to **Google Artifact Registry**.

---

## 1. Prerequisites & Required Tools

Ensure the following tools are installed on your deployment workstation:

| Tool | Minimum Version | Installation / Verification |
|---|---|---|
| **Google Cloud SDK (`gcloud`)** | `490.0.0+` | `gcloud version` ([Download](https://cloud.google.com/sdk/docs/install)) |
| **Docker Engine** | `26.0.0+` | `docker --version` |
| **Node.js** | `22.x LTS` | `node --version` |
| **Firebase CLI** | `13.x+` | `firebase --version` (`npm install -g firebase-tools`) |
| **Playwright** (for E2E verification) | `1.50+` | `npx playwright --version` |
| **Bruno CLI** (for API verification) | `1.30+` | `npx @usebruno/cli --version` |

### 1.1. Automated Prerequisite Verification & Installation Scripts

The repository includes automated scripts to audit and install missing workstation tools:

#### A. Install Missing Prerequisites
To automatically install or upgrade any missing prerequisites:

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File .\microservices\devops\scripts\install-prerequisites.ps1
```

**Linux / macOS / WSL:**
```bash
chmod +x ./microservices/devops/scripts/install-prerequisites.sh
./microservices/devops/scripts/install-prerequisites.sh
```

#### B. Audit Prerequisites
To run a fast pre-flight verification check:

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File .\microservices\devops\scripts\check-prerequisites.ps1
```

**Linux / macOS / WSL:**
```bash
chmod +x ./microservices/devops/scripts/check-prerequisites.sh
./microservices/devops/scripts/check-prerequisites.sh
```

---

## 2. Google Cloud CLI (`gcloud`) Authentication & Setup

### 2.1. Login to Google Cloud

#### Option A: Interactive Browser Login (Local Development)
```powershell
# 1. Authenticate user account
gcloud auth login

# 2. Authenticate Application Default Credentials (ADC) for local client libraries
gcloud auth application-default login
```

#### Option B: Headless Login (Remote Server or SSH without Browser)
```powershell
gcloud auth login --no-launch-browser
```
*Copy the URL into any browser, authenticate, and paste the authorization verification code back into the prompt.*

#### Option C: Service Account Authentication (CI/CD Automated Runners)
```powershell
gcloud auth activate-service-account --key-file="C:\path\to\service-account-key.json"
```

### 2.2. Configure Active Project & Default Region
Set the target GCP project (`logikchaindevelopment`, `logikchaintest`, or `logikchainproduction`) and default region:

```powershell
# Set target project (Development)
gcloud config set project logikchaindevelopment

# Set quota project for Application Default Credentials (ADC)
gcloud auth application-default set-quota-project logikchaindevelopment

# Set regional defaults
gcloud config set run/region asia-south1
gcloud config set artifacts/location asia-south1
```

> **GCP Project ID Reference:**
> - Development: `logikchaindevelopment` (Project Number: `762491756624`)
> - Test / Staging: `logikchaintest` (Project Number: `762355211817`)
> - Production: `logikchainproduction` (Project Number: `1053626325760`)

### 2.3. Authenticate Docker with Google Artifact Registry
Authorize Docker to authenticate with Google's Artifact Registry:
```powershell
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
```

### 2.4. Verify Required IAM Roles
The deploying identity (user or CI/CD service account) must hold the following IAM roles:
- `roles/run.admin` (Cloud Run Administrator)
- `roles/artifactregistry.writer` (Artifact Registry Writer)
- `roles/cloudbuild.builds.editor` (Cloud Build Editor)
- `roles/iam.serviceAccountUser` (Act as Cloud Run runtime service account)
- `roles/secretmanager.secretAccessor` (Secret Manager Secret Accessor)
- `roles/cloudsql.client` (Cloud SQL Client)

---

## 3. Pre-Flight Infrastructure Setup

### 3.1. Artifact Registry Repository
Verify or create the Docker repository in your active project (`logikchaindevelopment`):

**PowerShell:**
```powershell
# Create repository (if not already existing)
gcloud artifacts repositories create logikchain-microservices `
  --repository-format=docker `
  --location=asia-south1 `
  --project=logikchaindevelopment `
  --description="Logikchain Microservices Docker Registry"
```

**Bash:**
```bash
gcloud artifacts repositories create logikchain-microservices \
  --repository-format=docker \
  --location=asia-south1 \
  --project=logikchaindevelopment \
  --description="Logikchain Microservices Docker Registry"
```

### 3.2. Secret Manager Credentials
Epic-10's [`config-service`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/microservices/services/config-service) requires two runtime secrets:

#### PowerShell:
```powershell
# 1. Cloud SQL Database URL Secret
$DB_URL = "postgresql://postgres:MySecurePassword@/config_db?host=/cloudsql/logikchaindevelopment:asia-south1:logikchain-postgres-dev"
$DB_URL | gcloud secrets create config-service-db-url --data-file=- --replication-policy="automatic"
# If secret already exists and you want to update it:
# $DB_URL | gcloud secrets versions add config-service-db-url --data-file=-

# 2. Google Maps API Key Secret
$MAPS_KEY = "AIzaSyYourRestrictedGoogleMapsApiKey"
$MAPS_KEY | gcloud secrets create google-maps-api-key --data-file=- --replication-policy="automatic"
# If secret already exists and you want to update it:
# $MAPS_KEY | gcloud secrets versions add google-maps-api-key --data-file=-
```

#### Bash:
```bash
# 1. Cloud SQL Database URL Secret
echo -n "postgresql://postgres:MySecurePassword@/config_db?host=/cloudsql/logikchaindevelopment:asia-south1:logikchain-postgres-dev" | \
  gcloud secrets create config-service-db-url --data-file=- --replication-policy="automatic"

# 2. Google Maps API Key Secret
echo -n "AIzaSyYourRestrictedGoogleMapsApiKey" | \
  gcloud secrets create google-maps-api-key --data-file=- --replication-policy="automatic"
```

---

## 4. Deployment Artifacts & Configuration Files

The repository includes the following deployment YAML scripts in [`microservices/devops/ci-cd/`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/microservices/devops/ci-cd):

| File | Purpose | Description |
|---|---|---|
| [`cloudbuild-epic10.yaml`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/microservices/devops/ci-cd/cloudbuild-epic10.yaml) | Google Cloud Build Pipeline | Dedicated build, push, deploy, and health verification for Epic-10 `config-service`. |
| [`cloudrun-config-service.yaml`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/microservices/devops/ci-cd/cloudrun-config-service.yaml) | Declarative Cloud Run Spec | Knative v1 service manifest declaring CPU, RAM, Cloud SQL mount, secrets, probes, and autoscaling. |
| [`cloudbuild.yaml`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/microservices/devops/ci-cd/cloudbuild.yaml) | Multi-Service Build Pipeline | Monorepo CI/CD build configuration including Gateway, Sync-Engine, and Core microservices. |

---

## 5. Step-by-Step Deployment Execution

### Method 1: Google Cloud Build Pipeline (Recommended)

Execute the end-to-end build and deployment from the project root:

```powershell
gcloud builds submit `
  --config=microservices/devops/ci-cd/cloudbuild-epic10.yaml `
  --substitutions=_REGION="asia-south1",_REPO="logikchain-microservices",_CLOUDSQL_INSTANCE="logikchain-dev:asia-south1:logikchain-postgres-dev",_INGRESS="internal" `
  .
```

**Pipeline execution flow:**
1. **Container Build**: Compiles TypeScript monorepo packages (`@logikchain/common` and `config-service`) into Node.js 22 alpine runner image.
2. **Artifact Registry Push**: Pushes tags `:COMMIT_SHA` and `:latest` to `asia-south1-docker.pkg.dev/$PROJECT_ID/logikchain-microservices/config-service`.
3. **Cloud Run Deployment**: Deploys managed service with 1 vCPU, 1Gi RAM, Cloud SQL connection, and mounts secrets from Secret Manager.
4. **Health Probe**: Probes `/health` using an authorized Google identity token.

---

### Method 2: Declarative Cloud Run Deployment (`cloudrun-config-service.yaml`)

If compiling images locally or within an external CI system (e.g. GitHub Actions):

#### Step 1: Build and Push Container Image
```powershell
cd microservices
docker build -t asia-south1-docker.pkg.dev/logikchain-dev/logikchain-microservices/config-service:latest `
  --build-arg SERVICE_NAME=config-service `
  -f devops/docker/Dockerfile.service .

docker push asia-south1-docker.pkg.dev/logikchain-dev/logikchain-microservices/config-service:latest
cd ..
```

#### Step 2: Apply the Declarative Cloud Run Manifest
```powershell
# Substitute target project ID into the manifest
(Get-Content microservices/devops/ci-cd/cloudrun-config-service.yaml) -replace 'PROJECT_ID', 'logikchain-dev' | Set-Content microservices/devops/ci-cd/cloudrun-config-service.applied.yaml

# Apply declarative Knative spec to Cloud Run
gcloud run services replace microservices/devops/ci-cd/cloudrun-config-service.applied.yaml --region=asia-south1
```

---

### Method 3: Deploy Web PWA Front-End (Firebase Hosting)

Epic-10 includes Support console interfaces ([`SPT-10 Geo Registry`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-10), [`SPT-11 Subscription Admin`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-11), [`SPT-12 Tax Config`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-12), [`SPT-13 PUDO Commission`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-13), [`SPT-02.5 Bulk Ingestion`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Support.md#SPT-02.5)) and Supplier route authoring screens ([`SUP-03 Route Planner`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/constitution/wireframes/Supplier.md#SUP-03)):

```powershell
# For Development Environment:
npm --prefix web run deploy:dev

# For Test Environment:
npm --prefix web run deploy:test

# For Production Environment:
npm --prefix web run deploy:prod
```

---

## 6. Post-Deployment Verification & Testing

### 6.1. Direct Health Check Probe
Verify that [`config-service`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/microservices/services/config-service) is running and reporting healthy:
```powershell
$SERVICE_URL = gcloud run services describe config-service --region=asia-south1 --format='value(status.url)'
$ID_TOKEN = gcloud auth print-identity-token

curl -s -H "Authorization: Bearer $ID_TOKEN" "$SERVICE_URL/health"
```

**Expected JSON Response:**
```json
{
  "status": "ok",
  "service": "config-service",
  "timestamp": "2026-10-07T16:45:00.000Z",
  "sync": {
    "serviceName": "config-service",
    "firestoreCollection": "Villages",
    "totalSyncs": 0,
    "lastSyncTime": null,
    "pendingOutbox": 0
  }
}
```

### 6.2. Run Automated Bruno API Collections
Execute the complete Epic-10 API integration test collection in [`tests/bruno/11-config/`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/bruno/11-config):
```powershell
npx @usebruno/cli run tests/bruno/11-config --env dev
```
Verifies:
- `upsertCountry`, `upsertState`, `upsertDistrict`, `upsertVillage`
- `upsertSubscriptionPlan`, `upsertPlanTariff`, `upsertSubscriptionOffer`
- `routes/` (Master Route Corridors and deletion constraints)
- `supportProxy/` (`X-Supplier-Context` header governance)
- `bulkSupplierIngest/` (11-entity batch loader)

### 6.3. Run Automated Playwright E2E Tests
Execute browser-based user journey tests against the deployed PWA:
```powershell
npx playwright test tests/e2e/pwa/config-geo-hierarchy.spec.ts --project=test --config=playwright.pwa.config.ts
npx playwright test tests/e2e/pwa/config-subscription-plans.spec.ts --project=test --config=playwright.pwa.config.ts
npx playwright test tests/e2e/pwa/config-tax-profiles.spec.ts --project=test --config=playwright.pwa.config.ts
npx playwright test tests/e2e/pwa/support-supplier-bulk-ingest.spec.ts --project=test --config=playwright.pwa.config.ts
npx playwright test tests/e2e/pwa/support-supplier-proxy.spec.ts --project=test --config=playwright.pwa.config.ts
```

---

## 7. Troubleshooting & Rollbacks

### 7.1. Inspect Cloud Run Container Logs
```powershell
# Stream live logs for config-service
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=config-service"
```

### 7.2. Inspect Outbox & Firestore Sync Status
Check the status of background CDC synchronizations:
```powershell
curl -s -H "Authorization: Bearer $ID_TOKEN" "$SERVICE_URL/sync/status"
```

### 7.3. Rollback Cloud Run Revision
If a deployment exhibits regressions, instantly route 100% of traffic to the previous healthy revision:
```powershell
# List existing revisions
gcloud run revisions list --service=config-service --region=asia-south1

# Rollback traffic to prior revision
gcloud run services update-traffic config-service `
  --region=asia-south1 `
  --to-revisions=config-service-00001-abc=100
```
