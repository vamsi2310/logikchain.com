# Firebase Cloud Storage Architecture

This directory defines the operational configuration, security rules, and structural architecture for Google Cloud Storage / Firebase Storage across the Logikchain platform.

Governing Constitution:
- Architecture: `constitution/Logikchain_Architecture.md` §3 & §3.1
- Data Structures & Paths: `constitution/Logikchain_Data_Structures.md`
- Integration & Provisioning: `constitution/Logikchain_Integration_Config.md` §1.6
- Workflow & Deploy: `constitution/Logikchain_Firebase_Workflow.md`

---

## 1. Directory Structure

```
storage/
├── README.md         # This architecture documentation
├── storage.rules     # Storage security rules (mirrored at repo root)
└── cors.json         # CORS configuration for client uploads/downloads
```

---

## 2. Storage Bucket Folder Taxonomy

All storage objects live in the primary Firebase Storage bucket for that alias (`logikchain-dev.firebasestorage.app`, `logikchain-test.firebasestorage.app`, `logikchain-prod.firebasestorage.app`). Objects are partitioned into isolated top-level prefixes:

| Path Pattern | Category | Access Policy | Max Size | Allowed Content Types | Description |
| ------------ | -------- | ------------- | -------- | --------------------- | ----------- |
| `/profiles/{userId}/{filename}` | Profile Pictures | Public Read, Owner Write | 5 MB | `image/*` | User profile avatars (buyer, merchant, driver, supplier, support). |
| `/products/{supplierId}/{productId}/{filename}` | Product Media | Public Read, Supplier Write | 10 MB | `image/*` | Product inventory pictures and catalog illustrations. |
| `/products/{supplierId}/catalog/{filename}` | Catalog Media | Public Read, Supplier Write | 10 MB | `image/*` | Supplier promotional pamphlet and banner artwork. |
| `/proofs/{userId}/{filename}` | Delivery Proofs | Authenticated Read, Owner Write | 8 MB | `image/*` | Photos of goods delivery, customer signatures, vehicle odometer, handover evidence. |
| `/documents/{userId}/{category}/{filename}` | Statutory & KYC | Owner + Support Read/Write | 15 MB | `image/*`, `application/pdf` | Business licenses, PAN card, GSTIN certificates, driving license, vehicle registration. |
| `/exports/{userId}/{filename}` | Data Exports | Owner + Support Read, Server Write | 50 MB | `application/json`, `text/csv`, `application/zip` | User data export packages and scheduled financial reports. |
| `/payloads/{provider}/{date}/{id}.json` | Webhook Payloads | Server Only (`false`) | 10 MB | `application/json` | Raw gateway and provider webhook payloads preserved as immutable evidence. |
| `/challans/{periodId}/{filename}` | Tax & Challans | Server Only (`false`) | 20 MB | `application/pdf`, `image/*` | Government tax challans, TDS returns, and statutory filings. |
| `/evidence-packs/{periodId}/{filename}` | Financial Close | Server Only (`false`) | 100 MB | `application/zip`, `application/pdf` | Financial close audit packages and accounting period statements. |

---

## 3. Applying CORS Configuration

To allow direct browser uploads (resumable or byte uploads) and downloads without cross-origin blocking, apply `storage/cors.json` to the target alias bucket:

Using `gcloud storage`:
```bash
gcloud storage buckets update gs://<BUCKET_NAME> --cors-file=storage/cors.json
```

Or using `gsutil`:
```bash
gsutil cors set storage/cors.json gs://<BUCKET_NAME>
```

Example for development:
```bash
gsutil cors set storage/cors.json gs://logikchaindevelopment.firebasestorage.app
```

---

## 4. Deploying Storage Rules

Rules are deployed per alias following the project's naming law:

```bash
firebase deploy --project dev --only storage
firebase deploy --project test --only storage
```

> [!NOTE]
> If deploying to a newly created project for the first time, you must first navigate to the Firebase Console:
> **Firebase Console -> Build -> Storage -> Get Started**
> Select the region (`asia-south1`) to provision the default bucket before deploying rules.
