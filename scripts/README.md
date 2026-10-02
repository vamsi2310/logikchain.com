# Logikchain Deployment Scripts

This directory contains standardized, safe scripts for building, testing, and deploying Logikchain components to Firebase environments (`dev`, `test`, `prod`).

Scripts are organized into clean, modular subdirectories with dedicated scripts for PowerShell (`.ps1`) and Bash (`.sh`):

```text
scripts/
├── functions/      # Cloud Functions build and deployment
│   ├── build.ps1 / .sh
│   ├── deploy.ps1 / .sh
│   ├── deploy-dev.ps1 / .sh
│   ├── deploy-test.ps1 / .sh
│   └── deploy-prod.ps1 / .sh
├── web/            # Web App (Vite multi-role PWA) build and hosting deployment
│   ├── build.ps1 / .sh
│   ├── build-dev.ps1 / .sh
│   ├── build-test.ps1 / .sh
│   ├── build-prod.ps1 / .sh
│   ├── deploy.ps1 / .sh
│   ├── deploy-dev.ps1 / .sh
│   ├── deploy-test.ps1 / .sh
│   └── deploy-prod.ps1 / .sh
├── stack/          # Full-stack deployments (functions, rules, indexes, storage, hosting)
│   ├── deploy.ps1 / .sh
│   ├── deploy-dev.ps1 / .sh
│   ├── deploy-test.ps1 / .sh
│   └── deploy-prod.ps1 / .sh
├── tools/          # Utilities, testing, and seed tools
│   ├── run-bruno-tests.ps1 / .sh
│   └── seed-emulator.mjs
├── deploy.ps1      # Root convenience entrypoint (forwards to stack/deploy.ps1)
├── deploy.sh       # Root convenience entrypoint (forwards to stack/deploy.sh)
└── README.md
```

---

## Environment Mapping (`.firebaserc`)

| Alias | Firebase Project ID | Functions Target | Web Target / Mode |
| :--- | :--- | :--- | :--- |
| `dev` | `logikchaindevelopment` | Node 24 (2nd gen) | Vite `--mode development` (`web/.env.development`) |
| `test` | `logikchain-test` | Node 24 (2nd gen) | Vite `--mode test` (`web/.env.test`) |
| `prod` | `logikchain-prod` | Node 24 (2nd gen) | Vite `--mode production` (`web/.env.production`) |

---

## 1. Cloud Functions (`scripts/functions/`)

### Build Scripts
Compile TypeScript source code (`functions/src`) to JavaScript (`functions/lib`):

```powershell
# Standard compilation
.\scripts\functions\build.ps1

# Clean previous build artifacts and compile
.\scripts\functions\build.ps1 -Clean

# Run TypeScript compiler in watch mode
.\scripts\functions\build.ps1 -Watch

# Type-check source without emitting JavaScript
.\scripts\functions\build.ps1 -CheckOnly
```

**Bash Equivalents:**
```bash
./scripts/functions/build.sh [--clean] [--watch] [--check-only]
```

### Deploy Scripts
Deploy Cloud Functions to Firebase:

```powershell
# Deploy to DEV (logikchaindevelopment)
.\scripts\functions\deploy-dev.ps1

# Deploy to TEST (logikchain-test)
.\scripts\functions\deploy-test.ps1

# Deploy to PROD (logikchain-prod) — asks for confirmation unless -Force is passed
.\scripts\functions\deploy-prod.ps1 -Force

# Parameterized script: deploy a single function
.\scripts\functions\deploy.ps1 -Alias dev -OnlyFunction api
```

**Bash Equivalents:**
```bash
./scripts/functions/deploy-dev.sh
./scripts/functions/deploy-test.sh
./scripts/functions/deploy-prod.sh
./scripts/functions/deploy.sh dev [--only-function <name>] [--skip-build] [--force]
```

---

## 2. Web App (`scripts/web/`)

Compiles the 5 role entries (buyer `/`, merchant `/m/`, driver `/d/`, supplier `/s/`, support `/x/`) and deploys to Firebase Hosting.

### Build Scripts

```powershell
# Build for DEV
.\scripts\web\build-dev.ps1

# Build for TEST
.\scripts\web\build-test.ps1

# Build for PROD
.\scripts\web\build-prod.ps1

# Parameterized build with options
.\scripts\web\build.ps1 -Alias prod -Clean
.\scripts\web\build.ps1 -CheckOnly
```

**Bash Equivalents:**
```bash
./scripts/web/build-dev.sh
./scripts/web/build-test.sh
./scripts/web/build-prod.sh
./scripts/web/build.sh <dev|test|prod> [--clean] [--check-only]
```

### Deploy Scripts
Deploys the bundle to Firebase Hosting (`web/dist`), automatically building for the selected environment first:

```powershell
# Deploy Web App to DEV
.\scripts\web\deploy-dev.ps1

# Deploy Web App to TEST
.\scripts\web\deploy-test.ps1

# Deploy Web App to PROD — asks for confirmation unless -Force is passed
.\scripts\web\deploy-prod.ps1 -Force

# Parameterized deploy (skip build if current dist is ready)
.\scripts\web\deploy.ps1 -Alias dev -SkipBuild
```

**Bash Equivalents:**
```bash
./scripts/web/deploy-dev.sh
./scripts/web/deploy-test.sh
./scripts/web/deploy-prod.sh
./scripts/web/deploy.sh <dev|test|prod> [--skip-build] [--force]
```

---

## 3. Full-Stack Deployment (`scripts/stack/` & `scripts/`)

Deploys Cloud Functions, Firestore Rules & Indexes, Storage Rules, and Web Hosting together:

```powershell
# Deploy all to DEV
.\scripts\stack\deploy-dev.ps1

# Deploy all to TEST
.\scripts\stack\deploy-test.ps1 -Force

# Deploy all to PROD
.\scripts\stack\deploy-prod.ps1 -Force

# Root shortcut (delegates to stack/deploy.ps1):
.\scripts\deploy.ps1 -Alias dev
.\scripts\deploy.ps1 -Alias dev -Only functions,hosting
```

**Bash Equivalents:**
```bash
./scripts/stack/deploy-dev.sh
./scripts/stack/deploy-test.sh
./scripts/stack/deploy-prod.sh
./scripts/deploy.sh dev [--only <targets>] [--force]
```

---

## 4. Tools & Testing (`scripts/tools/`)

### Bruno API Test Runner
Runs the automated Bruno test suite against Dev Cloud or Local Emulators:

```powershell
# Run smoke tests on Dev Cloud
.\scripts\tools\run-bruno-tests.ps1 -Smoke

# Run specific folder tests
.\scripts\tools\run-bruno-tests.ps1 -Group 11-config

# Run tests against local emulator
.\scripts\tools\run-bruno-tests.ps1 -Env emulator
```

### Emulator Data Seeder
Seeds local Firestore and Auth emulators with foundational test records:

```powershell
node .\scripts\tools\seed-emulator.mjs
```

---

## Safety & Best Practices

1. **Always Aliased**: Scripts always pass `--project <alias>` to Firebase CLI, preventing accidental deploys to an unintended active project.
2. **Production Safeguard**: Deploys to `prod` prompt for explicit confirmation `Type 'yes'` unless `-Force` / `--force` is specified.
3. **Automated Bundle Integrity**: Web deploy scripts build the bundle with the correct environment configuration before running Firebase Hosting upload, ensuring no environment variables or endpoints get crossed.
