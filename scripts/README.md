# Logikchain Deployment Scripts

This directory contains standardized, safe scripts for deploying Logikchain components to Firebase environments (`dev`, `test`, `prod`).

Scripts are provided in both **PowerShell (`.ps1`)** for Windows and **Bash (`.sh`)** for Linux/macOS/CI.

---

## Environment Mapping (`.firebaserc`)

| Alias | Firebase Project ID | Build Mode / Target |
| :--- | :--- | :--- |
| `dev` | `logikchaindevelopment` | `functions` (Node 24, 2nd gen) / `web` (`--mode development`) |
| `test` | `logikchain-test` | `functions` (Node 24, 2nd gen) / `web` (`--mode test`) |
| `prod` | `logikchain-prod` | `functions` (Node 24, 2nd gen) / `web` (`--mode production`) |

---

## 0. Building Cloud Functions

Compile TypeScript source code (`functions/src`) to JavaScript (`functions/lib`):

```powershell
# Standard compilation
.\scripts\build-functions.ps1

# Clean previous build artifacts and compile
.\scripts\build-functions.ps1 -Clean

# Run TypeScript compiler in watch mode (auto-rebuilds on file save)
.\scripts\build-functions.ps1 -Watch

# Type-check source without emitting JavaScript
.\scripts\build-functions.ps1 -CheckOnly
```

### Bash Equivalents
```bash
./scripts/build-functions.sh [--clean] [--watch] [--check-only]
```

### NPM Shortcuts (inside functions/)
```bash
npm run build        # Compile TypeScript
npm run build:clean  # Clean lib and compile
npm run build:watch  # Continuous compilation on change
npm run lint         # Type check without output
```

---

## 1. Cloud Functions Deployment

### Direct Scripts
```powershell
# Deploy to DEV (logikchaindevelopment)
.\scripts\deploy-functions-dev.ps1

# Deploy to TEST (logikchain-test)
.\scripts\deploy-functions-test.ps1

# Deploy to PROD (logikchain-prod) — asks for confirmation unless -Force is passed
.\scripts\deploy-functions-prod.ps1
```

### Parameterized Script
```powershell
# Syntax: .\scripts\deploy-functions.ps1 -Alias <dev|test|prod> [-OnlyFunction <name>] [-Force] [-Interactive]

# Deploy only the 'api' function to dev:
.\scripts\deploy-functions.ps1 -Alias dev -OnlyFunction api

# Deploy to prod skipping interactive confirmation:
.\scripts\deploy-functions.ps1 -Alias prod -Force
```

### Bash Equivalents
```bash
./scripts/deploy-functions-dev.sh
./scripts/deploy-functions-test.sh
./scripts/deploy-functions-prod.sh
# or parameterized:
./scripts/deploy-functions.sh dev [--only-function <name>] [--force] [--interactive]
```

---

## 2. Web App (Hosting) Deployment

Each web deploy script automatically runs the appropriate Vite build for the target environment before uploading to Firebase Hosting (`web/dist`):

| Target | Build Command Triggered | Output Directory |
| :--- | :--- | :--- |
| `dev` | `npm run build:dev` | `web/dist` |
| `test` | `npm run build:test` | `web/dist` |
| `prod` | `npm run build:prod` | `web/dist` |

### Direct Scripts
```powershell
# Deploy Web App to DEV
.\scripts\deploy-web-dev.ps1

# Deploy Web App to TEST
.\scripts\deploy-web-test.ps1

# Deploy Web App to PROD — asks for confirmation unless -Force is passed
.\scripts\deploy-web-prod.ps1
```

### Parameterized Script
```powershell
# Syntax: .\scripts\deploy-web.ps1 -Alias <dev|test|prod> [-SkipBuild] [-Force] [-Interactive]

# Deploy without rebuilding (uses current web/dist):
.\scripts\deploy-web.ps1 -Alias dev -SkipBuild

# Deploy to prod skipping interactive prompt:
.\scripts\deploy-web.ps1 -Alias prod -Force
```

### Bash Equivalents
```bash
./scripts/deploy-web-dev.sh
./scripts/deploy-web-test.sh
./scripts/deploy-web-prod.sh
# or parameterized:
./scripts/deploy-web.sh dev [--skip-build] [--force] [--interactive]
```

---

## 3. Full-Stack Deployment (All Targets)

Deploys Cloud Functions, Firestore Rules & Indexes, Storage Rules, and Web Hosting together:

```powershell
# Deploy all to DEV
.\scripts\deploy-dev.ps1

# Deploy all to TEST
.\scripts\deploy-test.ps1 -Force

# Deploy all to PROD
.\scripts\deploy-prod.ps1 -Force

# Custom targets via main deploy script:
.\scripts\deploy.ps1 -Alias dev -Only functions,hosting
```

---

## Safety & Best Practices
1. **Always Aliased**: Scripts always pass `--project <alias>` to Firebase CLI, preventing accidental deploys to an unintended active project.
2. **Production Safeguard**: Deploys to `prod` prompt for explicit confirmation `Type 'yes'` unless `-Force` / `--force` is specified.
3. **Automated Bundle Integrity**: Web deploy scripts build the bundle with the correct environment configuration before running Firebase Hosting upload, ensuring no environment variables or endpoints get crossed.
