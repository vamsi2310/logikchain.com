import { env, missingFirebaseKeys } from "@/config/env";

/** Shown when the role app loaded but the alias env file has no Firebase web keys. */
export function MissingConfig() {
  const mode = import.meta.env.MODE;
  const envFile =
    mode === "production" ? ".env.production" : mode === "test" ? ".env.test" : ".env.development";
  const missing = missingFirebaseKeys();
  return (
    <div className="app-shell">
      <main className="page no-nav">
        <div className="hero">
          <h1>Logikchain</h1>
          <p className="muted">Buyer app loaded. Backend config is missing.</p>
        </div>
        <div className="card">
          <p className="card-title">Missing {env.alias} Firebase keys</p>
          <p>
            <code>npm run start:dev</code> reads <code>web/{envFile}</code>. That file is not in
            the repo and is not present on this machine, so Auth/Firestore never start and the
            page stayed blank.
          </p>
          <p className="muted">Empty: {missing.join(", ") || "apiKey, authDomain, projectId, appId"}</p>
        </div>
        <div className="card">
          <p className="card-title">Option 1 — local emulator</p>
          <p>Stop this server, then:</p>
          <pre style={{ whiteSpace: "pre-wrap", font: "var(--text-caption)" }}>
            {`firebase emulators:start
cd web
npm run start:emulator`}
          </pre>
        </div>
        <div className="card">
          <p className="card-title">Option 2 — remote {env.alias} project</p>
          <p>
            Copy <code>web/{envFile}.example</code> to <code>web/{envFile}</code> (already
            created locally if you pulled this tree) and paste the web app keys for alias{" "}
            <code>{env.alias}</code> from that Firebase console. Restart the Vite command.
          </p>
        </div>
      </main>
    </div>
  );
}
