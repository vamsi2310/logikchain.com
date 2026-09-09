import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

/** Serve each role's HTML for client-side routes during `vite` and `vite preview`. */
function roleAppFallback(): Plugin {
  const map: Array<[prefix: string, html: string]> = [
    ["/m", "/m/index.html"],
    ["/d", "/d/index.html"],
    ["/s", "/s/index.html"],
    ["/x", "/x/index.html"],
  ];
  const rewrite = (url: string | undefined): string | undefined => {
    if (!url || url.startsWith("/v1/") || url.includes(".")) return undefined;
    for (const [prefix, html] of map) {
      if (url === prefix || url.startsWith(`${prefix}/`)) return html;
    }
    return undefined;
  };
  return {
    name: "logikchain-role-app-fallback",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const dest = rewrite(req.url?.split("?")[0]);
        if (dest) req.url = dest;
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const dest = rewrite(req.url?.split("?")[0]);
        if (dest) req.url = dest;
        next();
      });
    },
  };
}

/**
 * Mode → env file (the only backend switch):
 *   development → .env.development  (alias `dev`)
 *   test        → .env.test         (alias `test`)
 *   production  → .env.production   (alias `prod`)
 *   emulator    → .env.emulator     (local emulators)
 */
export default defineConfig({
  plugins: [
    react(),
    roleAppFallback(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Logikchain",
        short_name: "Logikchain",
        description: "Rural logistics — buyers, Support, and supplier desktop",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#F4F6F4",
        theme_color: "#1B7F3B",
        lang: "en-IN",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/v1\//, /^\/m(\/|$)/, /^\/d(\/|$)/, /^\/s(\/|$)/, /^\/x(\/|$)/],
        runtimeCaching: [
          { urlPattern: /\/v1\//, handler: "NetworkOnly" },
          { urlPattern: /^https:\/\/firestore\.googleapis\.com\//, handler: "NetworkOnly" },
          { urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\//, handler: "NetworkOnly" },
          { urlPattern: /^https:\/\/securetoken\.googleapis\.com\//, handler: "NetworkOnly" },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "lc-storage",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  envPrefix: ["REACT_APP_", "FIREBASE_", "FUNCTIONS_"],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      input: {
        buyer: fileURLToPath(new URL("./index.html", import.meta.url)),
        merchant: fileURLToPath(new URL("./m/index.html", import.meta.url)),
        vehicle: fileURLToPath(new URL("./d/index.html", import.meta.url)),
        supplier: fileURLToPath(new URL("./s/index.html", import.meta.url)),
        support: fileURLToPath(new URL("./x/index.html", import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/firebase")) return "firebase";
          if (id.includes("node_modules/react")) return "react";
          if (
            id.includes("/src/config/") ||
            id.includes("/src/firebase/") ||
            id.includes("/src/api/") ||
            id.includes("/src/data/") ||
            id.includes("/src/state/") ||
            id.includes("/src/ui/") ||
            id.includes("/src/shared/")
          ) {
            return "kernel";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    fs: { allow: [root] },
  },
});
