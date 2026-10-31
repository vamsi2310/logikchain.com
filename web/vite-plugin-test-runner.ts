import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export interface TestCaseSuite {
  id: string;
  name: string;
  specFile: string;
  actor: string;
  description: string;
  status: "passed" | "failed" | "running" | "idle";
  duration?: number;
  lastRun?: string;
  videoUrl?: string;
  videoExists?: boolean;
  logOutput?: string;
}

const DEFAULT_SUITES: TestCaseSuite[] = [
  {
    id: "user-flow-login-role-village",
    name: "UC-01 / UC-02 / UC-03: User Journey: Login, Role Elevation, Corridor & Village Persistence",
    specFile: "tests/e2e/pwa/user-flow-login-role-village.spec.ts",
    actor: "Buyer / Merchant / Support",
    description: "Full user flow: seeds initial state, signs in with phone 8977848501 & OTP 123123, elevates role to Kirana Merchant, launches fullscreen corridor (/m/gigs), updates village to village_kandukur_523105 in profile, verifies persistence in PostgreSQL, and performs explicit sign-out.",
    status: "passed",
    duration: 26.2,
    lastRun: "2026-10-31T03:10:34.000Z",
    videoUrl: "/recordings/user-flow-login-role-village.webm",
    videoExists: true,
    logOutput: `Running 1 test using 1 worker\n\n[1/1] [test] › tests\\e2e\\pwa\\user-flow-login-role-village.spec.ts:34:7 › End-to-End User Flow: Login, Role Switch, Fullscreen App, and Village Update › UC-01 / UC-02 / UC-03: Complete User Journey: Phone Login -> Contact Support & Switch Role -> Open Fullscreen App -> Close App -> Update Village -> Explicit Sign Out\nVideo recording successfully saved to: recordings\\user-flow-login-role-village.webm\n\n  1 passed (26.2s)`
  },
  {
    id: "config-geo-hierarchy",
    name: "UC-22 (FEAT-10.01): Platform 4-Tier Geo-Hierarchy & Village Registry",
    specFile: "tests/e2e/pwa/config-geo-hierarchy.spec.ts",
    actor: "Support / Admin",
    description: "Full operator flow: stages 4-tier geographic master data, authenticates support session, audits Countries, States, Districts, Villages and Hubs at /x/config, and executes explicit sign-out.",
    status: "idle",
    videoUrl: "/recordings/config-geo-hierarchy.webm",
    videoExists: false,
  },
  {
    id: "usecases-commerce",
    name: "UC-04 / UC-05 / UC-06 / UC-07: Commerce, 2-Phase Credit Hold & Handover Gate",
    specFile: "tests/e2e/pwa/usecases-commerce.spec.ts",
    actor: "Merchant / Buyer",
    description: "Full commerce lifecycle: stages credit limits, authenticates merchant, evaluates credit headroom hold, generates UPI dynamic QR intent, executes vehicle departure gate, completes OTP handover signoff, tests doorstep return & RTO, and executes explicit sign-out.",
    status: "idle",
    videoUrl: "/recordings/usecases-commerce.webm",
    videoExists: false,
  },
  {
    id: "usecases-custody-payouts",
    name: "UC-08 / UC-09 / UC-10 / UC-11 / UC-12 / UC-13: Cash Custody, Discrepancies & Payouts",
    specFile: "tests/e2e/pwa/usecases-custody-payouts.spec.ts",
    actor: "Rider / Driver / Support",
    description: "Full cash custody and payouts flow: stages driver custody balance, authenticates driver, records CoD collection within daily ceiling, executes 6-digit turn-in OTP, triggers discrepancy circuit breaker, runs KMS bank beneficiary registration, executes Cloud Tasks IMPS transfer, and verifies supplier funds governance.",
    status: "idle",
    videoUrl: "/recordings/usecases-custody-payouts.webm",
    videoExists: false,
  },
  {
    id: "usecases-governance-ledger",
    name: "UC-14 to UC-21: Platform Governance, AML Velocity & Double-Entry Ledger",
    specFile: "tests/e2e/pwa/usecases-governance-ledger.spec.ts",
    actor: "Finance / Governance",
    description: "Full governance lifecycle: stages general ledger accounts, authenticates compliance officer, enforces UPI TPAP blacklist rejection, intercepts AML velocity anomalies, tracks 24-hr dispute SLA, enforces clickwrap legal policy consent, audits double-entry zero-sum ledger, runs nightly 3-way reconciliation, and signs out.",
    status: "idle",
    videoUrl: "/recordings/usecases-governance-ledger.webm",
    videoExists: false,
  },
  {
    id: "status-services",
    name: "UC-27 (EPIC-12): Microservices Mesh Health & Database Isolation Probes",
    specFile: "tests/e2e/pwa/status-services.spec.ts",
    actor: "DevOps / SRE",
    description: "Full observability flow: stages cluster health probes, connects telemetry observer, queries API Gateway :30080 health summary, validates all 13 services reporting HTTP 200, checks all 12 isolated database pools, and disconnects session observer.",
    status: "idle",
    videoUrl: "/recordings/status-services.webm",
    videoExists: false,
  },
  {
    id: "support-supplier-bulk-ingest",
    name: "UC-25 (FEAT-10.08): Wholesale Mill Supplier Bulk Catalog Ingestion",
    specFile: "tests/e2e/pwa/support-supplier-bulk-ingest.spec.ts",
    actor: "Supplier / Support",
    description: "Full ingestion flow: stages multi-entity catalog data for sup_ongole_01, signs in support operator, selects 11 entity types, validates schema dry-run, catches 14-char invalid GSTIN error, locks commit button, and executes explicit sign-out.",
    status: "idle",
    videoUrl: "/recordings/support-supplier-bulk-ingest.webm",
    videoExists: false,
  },
  {
    id: "config-tax-profiles",
    name: "UC-24 (FEAT-10.03): Regional Tax Profiles & Commodity GST Rates",
    specFile: "tests/e2e/pwa/config-tax-profiles.spec.ts",
    actor: "Finance / Admin",
    description: "Full tax compliance flow: stages commodity GST splits (0%, 5%, 18%) and Section 194C/194O TDS profiles, signs in tax officer, audits rates at /x/config/tax and /x/config/tds, and executes explicit sign-out.",
    status: "idle",
    videoUrl: "/recordings/config-tax-profiles.webm",
    videoExists: false,
  },
  {
    id: "config-subscription-plans",
    name: "UC-23 (FEAT-10.02): Commercial SaaS Subscription Plans & Tiered Tariffs",
    specFile: "tests/e2e/pwa/config-subscription-plans.spec.ts",
    actor: "Merchant / Admin",
    description: "Full commercial plans flow: stages Silver, Gold, Platinum plan tiers, signs in commercial operator, audits quotas at /x/config/plans and platform order tariffs at /x/config/tariffs, and executes explicit sign-out.",
    status: "idle",
    videoUrl: "/recordings/config-subscription-plans.webm",
    videoExists: false,
  },
  {
    id: "support-supplier-proxy",
    name: "UC-26 (FEAT-10.04): Support-as-Supplier Proxy Impersonation & Audit Trail",
    specFile: "tests/e2e/pwa/support-supplier-proxy.spec.ts",
    actor: "Support / Supplier",
    description: "Full proxy delegation flow: stages proxy authorization contexts, signs in operator, selects sup_ongole_01 via topbar switcher, confirms localStorage context persistence, verifies dual-identity audit headers, and executes explicit sign-out.",
    status: "idle",
    videoUrl: "/recordings/support-supplier-proxy.webm",
    videoExists: false,
  },
  {
    id: "status-test-runner",
    name: "UC-28 (FEAT-12.02): Live E2E Test Runner, Results Review & Video Playback Console",
    specFile: "tests/e2e/pwa/status-test-runner.spec.ts",
    actor: "DevOps / SRE",
    description: "Full test runner inspection flow: verifies /status/tests portal, switches between Microservices and Test Runner tabs, opens WebM video player, tests playback speeds (0.5x–2x), inspects log output modal, and downloads video recordings.",
    status: "idle",
    videoUrl: "/recordings/status-test-runner.webm",
    videoExists: false,
  },
];

export function testRunnerPlugin(): Plugin {
  const rootDir = path.resolve(__dirname, "..");
  const recordingsDir = path.resolve(rootDir, "recordings");
  const testResultsFile = path.resolve(recordingsDir, "test-results.json");

  // Ensure recordings directory exists
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  function getSavedResults(): TestCaseSuite[] {
    try {
      if (fs.existsSync(testResultsFile)) {
        const data = JSON.parse(fs.readFileSync(testResultsFile, "utf-8"));
        if (Array.isArray(data.suites)) {
          // Merge with DEFAULT_SUITES to ensure all suites exist
          return DEFAULT_SUITES.map((def) => {
            const found = data.suites.find((s: TestCaseSuite) => s.id === def.id);
            const videoPath = path.resolve(recordingsDir, `${def.id}.webm`);
            const videoExists = fs.existsSync(videoPath);
            return {
              ...def,
              ...found,
              name: def.name,
              actor: def.actor,
              description: def.description,
              videoExists,
              videoUrl: `/recordings/${def.id}.webm`,
            };
          });
        }
      }
    } catch (err) {
      console.error("[TestRunner] Error reading test results:", err);
    }

    // Default initialization
    return DEFAULT_SUITES.map((s) => {
      const videoPath = path.resolve(recordingsDir, `${s.id}.webm`);
      return {
        ...s,
        videoExists: fs.existsSync(videoPath),
        videoUrl: `/recordings/${s.id}.webm`,
      };
    });
  }

  function saveResults(suites: TestCaseSuite[]) {
    try {
      fs.writeFileSync(
        testResultsFile,
        JSON.stringify({ lastUpdated: new Date().toISOString(), suites }, null, 2),
        "utf-8"
      );
    } catch (err) {
      console.error("[TestRunner] Error writing test results:", err);
    }
  }

  let runningSuites = new Set<string>();

  return {
    name: "logikchain-test-runner",
    configureServer(server) {
      // 1. Video Streaming Endpoint with HTTP 206 Range Support
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/recordings/")) {
          const fileName = req.url.replace(/^\/recordings\//, "").split("?")[0];
          const filePath = path.resolve(recordingsDir, fileName);

          if (!fs.existsSync(filePath)) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Video not found");
            return;
          }

          const stat = fs.statSync(filePath);
          const fileSize = stat.size;
          const range = req.headers.range;

          if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;
            const file = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunksize,
              "Content-Type": "video/webm",
              "Access-Control-Allow-Origin": "*",
            });
            file.pipe(res);
          } else {
            res.writeHead(200, {
              "Content-Length": fileSize,
              "Accept-Ranges": "bytes",
              "Content-Type": "video/webm",
              "Access-Control-Allow-Origin": "*",
            });
            fs.createReadStream(filePath).pipe(res);
          }
          return;
        }

        // 2. GET /api/tests - List all test suites & results
        if (req.url === "/api/tests" && req.method === "GET") {
          const suites = getSavedResults().map((s) => ({
            ...s,
            status: runningSuites.has(s.id) ? "running" : s.status,
          }));
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ suites, runningCount: runningSuites.size }));
          return;
        }

        // 3. POST /api/tests/run - Execute a single test or all
        if (req.url?.startsWith("/api/tests/run") && req.method === "POST") {
          const urlObj = new URL(req.url, "http://localhost:5173");
          const queryId = urlObj.searchParams.get("id");

          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", async () => {
            let suiteId = queryId || "user-flow-login-role-village";
            try {
              // Check req.body if already parsed by upstream middleware
              if ((req as any).body && (req as any).body.id) {
                suiteId = (req as any).body.id;
              } else if (body) {
                const parsed = JSON.parse(body);
                if (parsed.id) suiteId = parsed.id;
              }
            } catch { }

            const suites = getSavedResults();
            const targetSuite = suites.find((s) => s.id === suiteId);
            if (!targetSuite) {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: `Suite ${suiteId} not found` }));
              return;
            }

            if (runningSuites.has(suiteId)) {
              res.writeHead(409, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: `Suite ${suiteId} is already running` }));
              return;
            }

            runningSuites.add(suiteId);
            res.writeHead(202, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ message: `Started test ${suiteId}`, suiteId }));

            // Execute Playwright test in background
            const startTime = Date.now();
            const specFilePath = path.resolve(rootDir, targetSuite.specFile);
            const testResultsDir = path.resolve(rootDir, "test-results");

            console.log(`[TestRunner] Executing Playwright test: ${specFilePath}`);

            const child = spawn(
              "npx.cmd",
              ["playwright", "test", targetSuite.specFile, "--config=playwright.pwa.config.ts", "--project=test"],
              {
                cwd: rootDir,
                shell: true,
                env: { ...process.env, CI: "1" },
              }
            );

            let stdout = "";
            let stderr = "";

            child.stdout?.on("data", (d) => {
              stdout += d.toString();
            });

            child.stderr?.on("data", (d) => {
              stderr += d.toString();
            });

            child.on("close", (code) => {
              const durationSec = Math.round((Date.now() - startTime) / 100) / 10;
              const passed = code === 0;
              console.log(`[TestRunner] Test ${suiteId} finished with code ${code} in ${durationSec}s`);

              // Check if Playwright generated a new video in test-results
              try {
                if (fs.existsSync(testResultsDir)) {
                  const dirs = fs.readdirSync(testResultsDir);
                  // Find newest dir matching test
                  let newestVideo: string | null = null;
                  let newestMtime = 0;

                  for (const dir of dirs) {
                    const videoCandidate = path.join(testResultsDir, dir, "video.webm");
                    if (fs.existsSync(videoCandidate)) {
                      const mtime = fs.statSync(videoCandidate).mtimeMs;
                      if (mtime > startTime - 5000 && mtime > newestMtime) {
                        newestMtime = mtime;
                        newestVideo = videoCandidate;
                      }
                    }
                  }

                  if (newestVideo) {
                    const destVideo = path.join(recordingsDir, `${suiteId}.webm`);
                    fs.copyFileSync(newestVideo, destVideo);
                    console.log(`[TestRunner] Saved video recording to: ${destVideo}`);
                  }
                }
              } catch (copyErr) {
                console.error("[TestRunner] Error checking/copying video:", copyErr);
              }

              // Update suite state
              const currentSuites = getSavedResults();
              const updated = currentSuites.map((s) => {
                if (s.id === suiteId) {
                  const videoPath = path.resolve(recordingsDir, `${s.id}.webm`);
                  return {
                    ...s,
                    status: (passed ? "passed" : "failed") as "passed" | "failed",
                    duration: durationSec,
                    lastRun: new Date().toISOString(),
                    videoExists: fs.existsSync(videoPath),
                    videoUrl: `/recordings/${s.id}.webm`,
                    logOutput: stdout + (stderr ? `\n--- STDERR ---\n${stderr}` : ""),
                  };
                }
                return s;
              });

              saveResults(updated);
              runningSuites.delete(suiteId);
            });
          });
          return;
        }

        next();
      });
    },
  };
}
