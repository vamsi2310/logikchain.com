# Runbook: Deploying Epic-10 (Platform Configuration & Geo-Registry)

This runbook documents the end-to-end deployment procedure for **EPIC-10: Master Configuration, Geo-Hierarchy & Subscriptions**, covering Google Cloud authentication, Artifact Registry, Cloud Run backend microservices, Cloud SQL database provisioning, Secret Manager, and Web PWA Firebase Hosting.

---

## 1. Scope of Epic-10 Deliverables

| Component | Repository Path | Target Runtime | Configuration / Port |
|---|---|---|---|
| **Config Microservice** | `microservices/services/config-service` | Google Cloud Run | Container Port: `4010`<br>Database: `config_db` (PostgreSQL) |
| **API Gateway Routing** | `microservices/services/gateway` | Google Cloud Run | Ingress: Public (`8080`)<br>Proxies `/api/v1/config` & `/v1/config/catalog` |
| **PWA Support & Supplier Screens** | `web/src/apps/support/`, `web/src/apps/supplier/` | Firebase Hosting | Screens `SPT-10`, `SPT-11`, `SPT-12`, `SPT-13`, `SPT-02.5`, `SUP-03` |
| **Cloud Build Pipeline** | `microservices/devops/ci-cd/cloudbuild-epic10.yaml` | Google Cloud Build | Multi-stage build, push, deploy, and health probe |
| **Cloud Run Declarative Spec** | `microservices/devops/ci-cd/cloudrun-config-service.yaml` | Google Cloud Run | Knative v1 declarative specification |

---

## 2. Google Cloud CLI (`gcloud`) Authentication & Setup

### 2.1. Prerequisites & Installation
Ensure `gcloud` CLI (Google Cloud SDK) is installed:
```powershell
gcloud version
```
If not installed, download from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install).

### 2.2. Login to `gcloud`

#### Option A: Interactive Developer Login (Browser)
```powershell
# 1. Authorize gcloud with your Google account
gcloud auth login

# 2. Authorize Application Default Credentials (ADC) for local SDKs
gcloud auth application-default login
```

#### Option B: Headless / Remote Login (Without Browser)
```powershell
gcloud auth login --no-launch-browser
```
Copy the provided URL into your browser, approve permissions, and paste the authorization token back into the terminal.

#### Option C: Service Account Login (CI/CD or Automated Environment)
```powershell
gcloud auth activate-service-account --key-file="C:\path\to\service-account-key.json"
```

### 2.3. Project & Region Configuration
Set your active project (e.g. `logikchain-dev`, `logikchain-test`, or `logikchain-prod`) and primary region:
```powershell
# Set active project
gcloud config set project logikchain-dev

# Set default Cloud Run & Artifact Registry region
gcloud config set run/region asia-south1
gcloud config set artifacts/location asia-south1
```

### 2.4. Configure Docker for Google Artifact Registry
Authorize Docker to authenticate with Google's Artifact Registry:
```powershell
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
```

### 2.5. Verify Required IAM Roles
The identity deploying Epic-10 must possess:
- `roles/run.admin` (Cloud Run Administrator)
- `roles/artifactregistry.writer` (Artifact Registry Writer)
- `roles/cloudbuild.builds.editor` (Cloud Build Editor)
- `roles/iam.serviceAccountUser` (Service Account User)
- `roles/secretmanager.secretAccessor` (Secret Accessor)
- `roles/cloudsql.client` (Cloud SQL Client)

---

## 3. Pre-Flight Infrastructure Setup

### 3.1. Ensure Artifact Registry Exists
```powershell
gcloud artifacts repositories describe logikchain-microservices `
  --location=asia-south1 `
  --project=logikchain-dev 2>$null || `
gcloud artifacts repositories create logikchain-microservices `
  --repository-format=docker `
  --location=asia-south1 `
  --project=logikchain-dev `
  --description="Logikchain Microservices Docker Registry"
```

### 3.2. Ensure Cloud Secrets Exist in Secret Manager
`config-service` requires credentials for Cloud SQL and Google Maps Geocoding:
```powershell
# 1. Database URL Secret (Cloud SQL socket syntax)
# Format: postgresql://postgres:<PASSWORD>@/config_db?host=/cloudsql/<PROJECT_ID>:asia-south1:<CLOUDSQL_INSTANCE>
echo -n "postgresql://postgres:MySecurePassword@/config_db?host=/cloudsql/logikchain-dev:asia-south1:logikchain-postgres-dev" | `
  gcloud secrets create config-service-db-url --data-file=- --replication-policy="automatic" 2>$null || `
echo -n "postgresql://postgres:MySecurePassword@/config_db?host=/cloudsql/logikchain-dev:asia-south1:logikchain-postgres-dev" | `
  gcloud secrets versions add config-service-db-url --data-file=-

# 2. Google Maps API Key Secret
echo -n "AIzaSyYourRestrictedGoogleMapsApiKey" | `
  gcloud secrets create google-maps-api-key --data-file=- --replication-policy="automatic" 2>$null || `
echo -n "AIzaSyYourRestrictedGoogleMapsApiKey" | `
  gcloud secrets versions add google-maps-api-key --data-file=-
```

---

## 4. Deployment Methods

### Method 1: Automated Deployment via Google Cloud Build (Recommended)
Use [cloudbuild-epic10.yaml](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/microservices/devops/ci-cd/cloudbuild-epic10.yaml):

```powershell
# Execute Cloud Build submission from repository root
gcloud builds submit `
  --config=microservices/devops/ci-cd/cloudbuild-epic10.yaml `
  --substitutions=_REGION="asia-south1",_REPO="logikchain-microservices",_CLOUDSQL_INSTANCE="logikchain-dev:asia-south1:logikchain-postgres-dev",_INGRESS="internal" `
  .
```

### Method 2: Declarative Cloud Run Manifest (`cloudrun-config-service.yaml`)
Use [cloudrun-config-service.yaml](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/microservices/devops/ci-cd/cloudrun-config-service.yaml):

1. **Build and push image manually**:
   ```powershell
   cd microservices
   docker build -t asia-south1-docker.pkg.dev/logikchain-dev/logikchain-microservices/config-service:latest `
     --build-arg SERVICE_NAME=config-service `
     -f devops/docker/Dockerfile.service .
   docker push asia-south1-docker.pkg.dev/logikchain-dev/logikchain-microservices/config-service:latest
   cd ..
   ```

2. **Apply declarative service definition**:
   ```powershell
   # Replace PROJECT_ID placeholder and apply manifest
   (Get-Content microservices/devops/ci-cd/cloudrun-config-service.yaml) -replace 'PROJECT_ID', 'logikchain-dev' | Set-Content microservices/devops/ci-cd/cloudrun-config-service.applied.yaml
   
   gcloud run services replace microservices/devops/ci-cd/cloudrun-config-service.applied.yaml --region=asia-south1
   ```

### Method 3: Deploy Web PWA Front-End to Firebase Hosting
Epic-10 includes Support console interfaces (`SPT-10 Geo Registry`, `SPT-11 Subscription Admin`, `SPT-12 Tax Config Console`, `SPT-13 PUDO Commission`, `SPT-02.5 Bulk Ingestion`):

```powershell
# For Dev environment:
npm --prefix web run deploy:dev

# For Test environment:
npm --prefix web run deploy:test

# For Prod environment:
npm --prefix web run deploy:prod
```

---

## 5. Post-Deployment Verification & Testing

### 5.1. Microservice Health Check
```powershell
$SERVICE_URL = gcloud run services describe config-service --region=asia-south1 --format='value(status.url)'
$ID_TOKEN = gcloud auth print-identity-token

# Invoke health endpoint
curl -s -H "Authorization: Bearer $ID_TOKEN" "$SERVICE_URL/health"
```
Expected response:
```json
{
  "status": "ok",
  "service": "config-service",
  "timestamp": "2026-10-07T...",
  "sync": {
    "totalSyncs": 0,
    "lastSyncTime": null,
    "pendingOutbox": 0
  }
}
```

### 5.2. Run Bruno Automated API Test Suite
```powershell
# Run Epic-10 Bruno API collection
npx @usebruno/cli run tests/bruno/11-config --env dev
```

### 5.3. Run Playwright E2E Verification
```powershell
# Run PWA Playwright specs against deployed environment
npx playwright test tests/e2e/pwa/config-geo-hierarchy.spec.ts --project=test --config=playwright.pwa.config.ts
npx playwright test tests/e2e/pwa/config-subscription-plans.spec.ts --project=test --config=playwright.pwa.config.ts
npx playwright test tests/e2e/pwa/config-tax-profiles.spec.ts --project=test --config=playwright.pwa.config.ts
```
